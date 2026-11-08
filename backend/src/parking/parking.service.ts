import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, In, Repository } from 'typeorm';
import { Entry } from './entry.entity';
import { Vehicle, VehicleType } from '../vehicles/vehicle.entity';
import { Tenant } from '../tenants/tenant.entity';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { Settings } from '../settings/settings.entity';
import { ReceiptsService } from '../receipts/receipts.service';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function detectTypeFromPlate(plate: string): VehicleType {
  // Moto colombiana: 3 letras + 2 dígitos + 1 letra  (ej. XTE09I)
  if (/^[A-Z]{3}\d{2}[A-Z]$/i.test(plate)) return VehicleType.MOTO;
  // Carro/camión:   3 letras + 3 dígitos             (ej. ABC123)
  return VehicleType.CAR;
}

// Un vehículo que lleva más de esto adentro suele ser síntoma de abandono,
// olvido del operador o evasión de cobro — no de una estadía legítima larga.
const EXCESSIVE_TIME_ALERT_MINUTES = 24 * 60;

// Ventana aceptada para la hora que reporta un detector (cola offline).
// Más vieja que esto ya no es confiable como hora de entrada; un poco en el futuro
// se tolera por diferencias de reloj entre el PC del parqueadero y el servidor.
const MAX_DETECTION_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000;

function calculateFare(totalMinutes: number, vehicleType: string, s: Settings): number {
  const isMoto = vehicleType === 'moto';
  const fraccion = isMoto ? s.fraccionMoto : s.fraccionCarro;
  const hora     = isMoto ? s.horaMoto     : s.horaCarro;
  const medioDia = isMoto ? s.medioDiaMoto : s.medioDiaCarro;
  const dia      = isMoto ? s.diaMoto      : s.diaCarro;

  if (totalMinutes <= 15)  return fraccion;
  if (totalMinutes <= 60)  return hora;
  if (totalMinutes <= 360) return medioDia;
  if (totalMinutes <= 720) return dia;
  return Math.ceil(totalMinutes / 1440) * dia;
}

@Injectable()
export class ParkingService {
  constructor(
    @InjectRepository(Entry)
    private readonly entryRepo: Repository<Entry>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly membershipsService: MembershipsService,
    private readonly notificationsService: NotificationsService,
    private readonly settingsService: SettingsService,
    private readonly receiptsService: ReceiptsService,
  ) {}

  private async getSettingsOrThrow(tenantId: number): Promise<Settings> {
    const settings = await this.settingsService.get(tenantId);
    if (!settings) {
      throw new BadRequestException(
        'Este negocio aún no tiene tarifas configuradas. Configúralas en Tarifas antes de operar el parqueadero.',
      );
    }
    return settings;
  }

  async registerEntry(
    tenantId: number,
    plate: string,
    requestedType?: 'car' | 'moto',
    detectedAt?: Date,
  ): Promise<Entry & { action: string }> {
    const normalized = plate.toUpperCase();
    if (detectedAt) {
      const age = Date.now() - detectedAt.getTime();
      if (age > MAX_DETECTION_AGE_MS) {
        throw new BadRequestException('La detección tiene más de 24 horas; regístrala manualmente.');
      }
      if (age < -MAX_CLOCK_SKEW_MS) {
        throw new BadRequestException('La hora de detección está en el futuro; revisa el reloj del detector.');
      }
    }
    const existing = await this.entryRepo.findOne({
      where: { tenantId, plate: normalized, exitTime: IsNull() },
    });
    if (existing) {
      throw new ConflictException(
        `El vehículo ${normalized} ya se encuentra dentro del parqueadero`,
      );
    }

    const chosenType: VehicleType | undefined =
      requestedType === 'car' ? VehicleType.CAR :
      requestedType === 'moto' ? VehicleType.MOTO :
      undefined;

    let vehicle = await this.vehicleRepo.findOne({ where: { tenantId, plate: normalized } });
    if (!vehicle) {
      vehicle = await this.vehicleRepo.save(
        this.vehicleRepo.create({
          tenantId,
          plate: normalized,
          type: chosenType ?? detectTypeFromPlate(normalized),
          clientId: null,
        }),
      );
    }
    const entry = await this.entryRepo.save(
      this.entryRepo.create({
        tenantId,
        plate: normalized,
        vehicleType: chosenType ?? vehicle.type,
        vehicleId: vehicle.id,
        ...(detectedAt && { entryTime: detectedAt }),
      }),
    );

    const { status } = await this.membershipsService.getStatusByPlate(normalized, tenantId);
    const action =
      status === 'ACTIVE' ? 'GRANTED' :
      status === 'EXPIRED' ? 'ALERT' :
      'VISITOR';

    void this.notificationsService.notifyEntry(normalized, entry.entryTime);
    return { ...entry, action };
  }

  async registerExit(tenantId: number, plate: string) {
    const normalized = plate.toUpperCase();
    const entry = await this.entryRepo.findOne({
      where: { tenantId, plate: normalized, exitTime: IsNull() },
    });
    if (!entry) {
      throw new NotFoundException(
        `No se encontró un ingreso activo para la placa ${normalized}`,
      );
    }

    const exitTime = new Date();
    const totalMinutes = Math.ceil(
      (exitTime.getTime() - entry.entryTime.getTime()) / 60000,
    );

    const { status } = await this.membershipsService.getStatusByPlate(normalized, tenantId);
    const coveredByMembership = status === 'ACTIVE';
    let amountToPay = 0;
    if (!coveredByMembership) {
      const settings = await this.getSettingsOrThrow(tenantId);
      const vehicleType = entry.vehicleType ?? 'car';
      amountToPay = calculateFare(totalMinutes, vehicleType, settings);
    }

    entry.exitTime = exitTime;
    entry.amountPaid = amountToPay;
    entry.coveredByMembership = coveredByMembership;
    await this.entryRepo.save(entry);

    const duration = formatDuration(totalMinutes);
    void this.notificationsService.notifyExit(normalized, exitTime, duration, amountToPay);

    return {
      plate: normalized,
      entryTime: entry.entryTime,
      exitTime,
      duration,
      totalMinutes,
      amountToPay,
      currency: 'COP',
      receiptUrl: `/parking/entries/${entry.id}/receipt?tenantId=${tenantId}`,
    };
  }

  async getExitReceiptPdf(tenantId: number, entryId: number): Promise<{ buffer: Buffer; filename: string }> {
    const entry = await this.entryRepo.findOne({ where: { id: entryId, tenantId } });
    if (!entry) throw new NotFoundException(`Ingreso ${entryId} no encontrado`);
    if (!entry.exitTime) {
      throw new BadRequestException('Este ingreso todavía no tiene una salida registrada');
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Negocio ${tenantId} no encontrado`);

    const vehicle = entry.vehicleId
      ? await this.vehicleRepo.findOne({ where: { id: entry.vehicleId } })
      : null;

    const totalMinutes = Math.ceil(
      (entry.exitTime.getTime() - entry.entryTime.getTime()) / 60000,
    );

    const buffer = await this.receiptsService.buildParkingExitReceipt({
      tenantName: tenant.name,
      tenantPhone: tenant.contactPhone,
      tenantEmail: tenant.contactEmail,
      folio: entry.id,
      plate: entry.plate,
      vehicleType: entry.vehicleType ?? vehicle?.type ?? 'car',
      vehicleBrand: vehicle?.brand ?? null,
      entryTime: entry.entryTime,
      exitTime: entry.exitTime,
      durationLabel: formatDuration(totalMinutes),
      amountPaid: entry.amountPaid ?? 0,
      coveredByMembership: entry.coveredByMembership,
      issuedAt: new Date(),
    });

    return { buffer, filename: `recibo-${entry.plate}-${entry.id}.pdf` };
  }

  async getStatus(tenantId: number, plate: string) {
    const normalized = plate.toUpperCase();
    const entry = await this.entryRepo.findOne({
      where: { tenantId, plate: normalized, exitTime: IsNull() },
    });
    if (!entry) return { plate: normalized, isInside: false };

    const currentMinutes = Math.floor(
      (Date.now() - entry.entryTime.getTime()) / 60000,
    );
    return {
      plate: normalized,
      isInside: true,
      entryTime: entry.entryTime,
      currentMinutes,
      duration: formatDuration(currentMinutes),
    };
  }

  async getActive(tenantId: number) {
    const entries = await this.entryRepo.find({
      where: { tenantId, exitTime: IsNull() },
      order: { entryTime: 'ASC' },
    });
    if (entries.length === 0) return [];

    const plates = entries.map((e) => e.plate);
    const vehicles = await this.vehicleRepo.find({ where: { tenantId, plate: In(plates) } });
    const vehicleMap = new Map(vehicles.map((v) => [v.plate, v]));
    const settings = await this.settingsService.get(tenantId);
    const now = Date.now();

    return entries.map((e) => {
      const vehicle = vehicleMap.get(e.plate);
      const vehicleType = e.vehicleType ?? vehicle?.type ?? 'car';
      const currentMinutes = Math.floor((now - e.entryTime.getTime()) / 60000);
      const estimatedCost = settings ? calculateFare(currentMinutes, vehicleType, settings) : 0;
      return {
        id: e.id,
        plate: e.plate,
        vehicleType,
        entryTime: e.entryTime,
        currentMinutes,
        duration: formatDuration(currentMinutes),
        estimatedCost,
        excessiveTimeAlert: currentMinutes >= EXCESSIVE_TIME_ALERT_MINUTES,
      };
    });
  }

  getEntries(tenantId: number): Promise<Entry[]> {
    return this.entryRepo.find({ where: { tenantId }, order: { entryTime: 'DESC' } });
  }

  async cleanupAllMemberships(): Promise<{ deleted: number }> {
    return this.membershipsService.cleanupAll();
  }

  async cleanupOpenEntries(): Promise<{ deleted: number }> {
    const result = await this.entryRepo.delete({ exitTime: IsNull() });
    return { deleted: result.affected ?? 0 };
  }
}
