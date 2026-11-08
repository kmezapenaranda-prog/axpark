import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Membership, MembershipStatus } from './membership.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Client } from '../clients/client.entity';
import { Tenant } from '../tenants/tenant.entity';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { ReceiptsService } from '../receipts/receipts.service';

function getTodayBogota(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

function normalizeDateStr(d: string | Date): string {
  return typeof d === 'string'
    ? d.slice(0, 10)
    : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d);
}

// Días transcurridos entre dos fechas YYYY-MM-DD (positivo = from ya pasó).
function daysBetween(fromISO: string, toISO: string): number {
  const [fy, fm, fd] = fromISO.split('-').map(Number);
  const [ty, tm, td] = toISO.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

// El status guardado en BD no se actualiza solo con el paso del tiempo (solo
// create/renew lo tocan) — se recalcula aquí para lo que se lee, sin persistirlo.
function withComputedStatus(m: Membership): Membership & { daysOverdue: number } {
  const today = getTodayBogota();
  const endDateStr = normalizeDateStr(m.endDate);
  if (m.status !== MembershipStatus.CANCELLED) {
    m.status = endDateStr < today ? MembershipStatus.EXPIRED : MembershipStatus.ACTIVE;
  }
  return { ...m, daysOverdue: daysBetween(endDateStr, today) };
}

@Injectable()
export class MembershipsService {
  constructor(
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly receiptsService: ReceiptsService,
  ) {}

  async create(dto: CreateMembershipDto): Promise<Membership & { receiptUrl: string }> {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: dto.vehicleId, tenantId: dto.tenantId },
    });
    if (!vehicle) throw new NotFoundException(`Vehículo ${dto.vehicleId} no encontrado`);

    const client = await this.clientRepo.findOne({
      where: { id: dto.clientId, tenantId: dto.tenantId },
    });
    if (!client) throw new NotFoundException(`Cliente ${dto.clientId} no encontrado`);

    const activeMembership = await this.membershipRepo.findOne({
      where: { vehicleId: dto.vehicleId, status: MembershipStatus.ACTIVE },
    });
    if (activeMembership) {
      throw new ConflictException(
        'El vehículo ya tiene una mensualidad activa. Debe vencerla o cancelarla antes de crear una nueva',
      );
    }

    const membership = this.membershipRepo.create({
      tenantId: dto.tenantId,
      vehicleId: dto.vehicleId,
      clientId: dto.clientId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      status: dto.status ?? MembershipStatus.ACTIVE,
      price: dto.price,
      autoRenew: dto.autoRenew ?? false,
      company: dto.company ?? null,
      paidAt: new Date(),
    });
    const saved = await this.membershipRepo.save(membership);
    return {
      ...saved,
      receiptUrl: `/memberships/${saved.id}/receipt?tenantId=${dto.tenantId}`,
    };
  }

  async cleanupAll(): Promise<{ deleted: number }> {
    const result = await this.membershipRepo.query('DELETE FROM memberships');
    return { deleted: result[1] ?? 0 };
  }

  async findAll(tenantId: number): Promise<(Membership & { daysOverdue: number })[]> {
    const memberships = await this.membershipRepo.find({
      where: { tenantId },
      relations: ['client', 'vehicle'],
      order: { createdAt: 'DESC' },
    });
    return memberships.map(withComputedStatus);
  }

  async getStatusByPlate(plate: string, tenantId: number): Promise<{ status: string; membership?: Membership }> {
    const vehicle = await this.vehicleRepo.findOne({ where: { plate: plate.toUpperCase(), tenantId } });
    if (!vehicle) return { status: 'NOT_FOUND' };

    // find() + take:1 garantiza ORDER BY end_date DESC LIMIT 1 sin el bug de findOne+order
    const results = await this.membershipRepo.find({
      where: { vehicleId: vehicle.id },
      order: { endDate: 'DESC' },
      take: 1,
    });
    if (results.length === 0) return { status: 'NOT_FOUND' };
    const membership = results[0];

    const today = getTodayBogota();
    const endDateStr =
      typeof membership.endDate === 'string'
        ? membership.endDate.slice(0, 10)
        : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(
            membership.endDate as unknown as Date,
          );
    if (endDateStr < today) return { status: 'EXPIRED', membership };
    return { status: 'ACTIVE', membership };
  }

  async renew(id: number, tenantId: number): Promise<Membership & { receiptUrl: string }> {
    const membership = await this.membershipRepo.findOne({ where: { id, tenantId } });
    if (!membership) throw new NotFoundException(`Mensualidad ${id} no encontrada`);

    // Extend end_date by exactly 1 month from the current end_date
    const currentEnd = new Date(membership.endDate + 'T12:00:00');
    currentEnd.setMonth(currentEnd.getMonth() + 1);
    membership.endDate = currentEnd.toISOString().split('T')[0];
    membership.status = MembershipStatus.ACTIVE;
    membership.paidAt = new Date();
    const saved = await this.membershipRepo.save(membership);
    return {
      ...saved,
      receiptUrl: `/memberships/${saved.id}/receipt?tenantId=${tenantId}`,
    };
  }

  async getReceiptPdf(tenantId: number, membershipId: number): Promise<{ buffer: Buffer; filename: string }> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId, tenantId },
      relations: ['client', 'vehicle'],
    });
    if (!membership) throw new NotFoundException(`Mensualidad ${membershipId} no encontrada`);
    if (!membership.paidAt) {
      throw new NotFoundException(`La mensualidad ${membershipId} todavía no tiene un pago registrado`);
    }

    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException(`Negocio ${tenantId} no encontrado`);

    const buffer = await this.receiptsService.buildMembershipReceipt({
      tenantName: tenant.name,
      tenantPhone: tenant.contactPhone,
      tenantEmail: tenant.contactEmail,
      folio: membership.id,
      clientName: membership.client.fullName,
      clientDocument: membership.client.document,
      clientPhone: membership.client.phone,
      plate: membership.vehicle.plate,
      vehicleType: membership.vehicle.type,
      vehicleBrand: membership.vehicle.brand,
      startDate: membership.startDate,
      endDate: membership.endDate,
      price: Number(membership.price),
      autoRenew: membership.autoRenew,
      company: membership.company,
      paidAt: membership.paidAt,
      issuedAt: new Date(),
    });

    return { buffer, filename: `mensualidad-${membership.vehicle.plate}-${membership.id}.pdf` };
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const membership = await this.membershipRepo.findOne({ where: { id, tenantId } });
    if (!membership) throw new NotFoundException(`Mensualidad ${id} no encontrada`);
    await this.membershipRepo.softDelete(id);
  }

  findExpiring(tenantId: number): Promise<Membership[]> {
    const today = getTodayBogota();
    const limit = new Date(today + 'T12:00:00');
    limit.setDate(limit.getDate() + 7);
    const in7Days = limit.toISOString().split('T')[0];

    return this.membershipRepo.find({
      relations: ['client', 'vehicle'],
      where: {
        tenantId,
        status: MembershipStatus.ACTIVE,
        endDate: Between(today, in7Days),
      },
      order: { endDate: 'ASC' },
    });
  }
}
