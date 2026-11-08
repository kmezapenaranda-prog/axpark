import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, MoreThanOrEqual, Not, Repository } from 'typeorm';
import { Entry } from '../parking/entry.entity';
import { Membership, MembershipStatus } from '../memberships/membership.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Client } from '../clients/client.entity';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getTodayBogota(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

function daysAgoBogota(days: number): string {
  const limit = new Date(getTodayBogota() + 'T12:00:00');
  limit.setDate(limit.getDate() - days);
  return limit.toISOString().split('T')[0];
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Entry)
    private readonly entryRepo: Repository<Entry>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
  ) {}

  // Ingresos de un rango de fechas [desde, hasta] (inclusive), zona horaria Bogotá.
  // Usa SQL crudo a propósito: no debe filtrar por soft-delete, un ingreso ya
  // cobrado sigue contando aunque el vehículo/mensualidad se desactive después.
  private async getIngresosRange(tenantId: number, desde: string, hasta: string): Promise<number> {
    const [entradas, mensualidades] = await Promise.all([
      this.entryRepo.query(
        `SELECT COALESCE(SUM(amount_paid), 0) AS total
         FROM entries
         WHERE tenant_id = $1
           AND exit_time IS NOT NULL
           AND (exit_time AT TIME ZONE 'America/Bogota')::date BETWEEN $2::date AND $3::date`,
        [tenantId, desde, hasta],
      ),
      this.membershipRepo.query(
        `SELECT COALESCE(SUM(price), 0) AS total
         FROM memberships
         WHERE tenant_id = $1
           AND paid_at IS NOT NULL
           AND (paid_at AT TIME ZONE 'America/Bogota')::date BETWEEN $2::date AND $3::date`,
        [tenantId, desde, hasta],
      ),
    ]);
    return Number(entradas[0].total) + Number(mensualidades[0].total);
  }

  async getSummary(tenantId: number) {
    const today = getTodayBogota();
    const sevenDaysAgo = daysAgoBogota(6);
    const thirtyDaysAgo = daysAgoBogota(29);

    const [
      ingresosHoy,
      ingresos7Dias,
      ingresos30Dias,
      clientes,
      vehiculos,
      mensualidadesActivas,
      mensualidadesVencidas,
      horasPicoRaw,
      vehiculosFrecuentesRaw,
    ] = await Promise.all([
      this.getIngresosRange(tenantId, today, today),
      this.getIngresosRange(tenantId, sevenDaysAgo, today),
      this.getIngresosRange(tenantId, thirtyDaysAgo, today),
      this.clientRepo.count({ where: { tenantId } }),
      this.vehicleRepo.count({ where: { tenantId } }),
      this.membershipRepo.count({
        where: { tenantId, status: Not(MembershipStatus.CANCELLED), endDate: MoreThanOrEqual(today) },
      }),
      this.membershipRepo.count({
        where: { tenantId, status: Not(MembershipStatus.CANCELLED), endDate: LessThan(today) },
      }),
      this.entryRepo.query(
        `SELECT EXTRACT(HOUR FROM entry_time AT TIME ZONE 'America/Bogota')::int AS hora,
                COUNT(*)::int AS cantidad
         FROM entries
         WHERE tenant_id = $1
           AND (entry_time AT TIME ZONE 'America/Bogota')::date BETWEEN $2::date AND $3::date
         GROUP BY hora
         ORDER BY cantidad DESC, hora ASC
         LIMIT 5`,
        [tenantId, thirtyDaysAgo, today],
      ),
      this.entryRepo.query(
        `SELECT plate, COUNT(*)::int AS cantidad
         FROM entries
         WHERE tenant_id = $1
           AND (entry_time AT TIME ZONE 'America/Bogota')::date BETWEEN $2::date AND $3::date
         GROUP BY plate
         ORDER BY cantidad DESC, plate ASC
         LIMIT 5`,
        [tenantId, thirtyDaysAgo, today],
      ),
    ]);

    return {
      ingresosHoy,
      ingresos7Dias,
      ingresos30Dias,
      clientes,
      vehiculos,
      mensualidadesActivas,
      mensualidadesVencidas,
      horasPico: (horasPicoRaw as Array<{ hora: number; cantidad: number }>).map((r) => ({
        hora: `${String(r.hora).padStart(2, '0')}:00`,
        cantidad: Number(r.cantidad),
      })),
      vehiculosFrecuentes: (vehiculosFrecuentesRaw as Array<{ plate: string; cantidad: number }>).map((r) => ({
        plate: r.plate,
        cantidad: Number(r.cantidad),
      })),
    };
  }

  async getCajaReport(fecha: string, tenantId: number) {
    // Vehicles that entered on this date (for count, hourly breakdown, visitor classification)
    const entradas: { plate: string }[] = await this.entryRepo.query(
      `SELECT plate FROM entries
       WHERE tenant_id = $2
         AND (entry_time AT TIME ZONE 'America/Bogota')::date = $1::date`,
      [fecha, tenantId],
    );

    // Closed entries whose exit_time falls on this date → revenue of the day
    // Aliases map snake_case columns to camelCase so JS code can access them correctly
    const cobrosRaw: Array<{
      plate: string;
      vehicleType: string | null;
      entryTime: Date;
      exitTime: Date;
      amountPaid: number | null;
    }> = await this.entryRepo.query(
      `SELECT plate,
              vehicle_type  AS "vehicleType",
              entry_time    AS "entryTime",
              exit_time     AS "exitTime",
              amount_paid   AS "amountPaid"
       FROM entries
       WHERE tenant_id = $2
         AND exit_time IS NOT NULL
         AND (exit_time AT TIME ZONE 'America/Bogota')::date = $1::date
       ORDER BY exit_time ASC`,
      [fecha, tenantId],
    );

    // Plates with active membership on this date
    const membershipRows: { plate: string }[] = await this.membershipRepo.query(
      `SELECT DISTINCT v.plate FROM memberships m
       JOIN vehicles v ON v.id = m.vehicle_id
       WHERE m.tenant_id = $2 AND m.start_date <= $1 AND m.end_date >= $1`,
      [fecha, tenantId],
    );
    const membershipPlates = new Set(membershipRows.map((r) => r.plate));

    // Membership payments (nuevas + renovaciones) realizados este día → suman al ingreso del día
    const pagosMensualidadesRaw: Array<{
      plate: string;
      price: string;
      paidAt: Date;
    }> = await this.membershipRepo.query(
      `SELECT v.plate AS plate, m.price AS price, m.paid_at AS "paidAt"
       FROM memberships m
       JOIN vehicles v ON v.id = m.vehicle_id
       WHERE m.tenant_id = $2
         AND m.paid_at IS NOT NULL
         AND (m.paid_at AT TIME ZONE 'America/Bogota')::date = $1::date
       ORDER BY m.paid_at ASC`,
      [fecha, tenantId],
    );

    // Hourly breakdown by entry hour in Bogotá
    const hourRows: { hora: number; cantidad: number }[] = await this.entryRepo.query(
      `SELECT EXTRACT(HOUR FROM entry_time AT TIME ZONE 'America/Bogota')::int AS hora,
              COUNT(*)::int AS cantidad
       FROM entries
       WHERE tenant_id = $2
         AND (entry_time AT TIME ZONE 'America/Bogota')::date = $1::date
       GROUP BY hora
       ORDER BY hora ASC`,
      [fecha, tenantId],
    );

    const ingresosMensualidades = pagosMensualidadesRaw.reduce((sum, p) => sum + Number(p.price), 0);
    const totalCOP = cobrosRaw.reduce((sum, e) => sum + (e.amountPaid ?? 0), 0) + ingresosMensualidades;
    const totalVehiculos = entradas.length;
    const mensualidades = entradas.filter((e) => membershipPlates.has(e.plate)).length;
    const visitantes = totalVehiculos - mensualidades;

    const desglosePorHora = hourRows.map((r) => ({
      hora: `${String(r.hora).padStart(2, '0')}:00`,
      cantidad: Number(r.cantidad),
    }));

    const cobros = cobrosRaw.map((e) => {
      const totalMinutes = Math.ceil(
        (new Date(e.exitTime).getTime() - new Date(e.entryTime).getTime()) / 60000,
      );
      return {
        placa: e.plate,
        tipo: e.vehicleType ?? 'car',
        esMensualidad: membershipPlates.has(e.plate),
        horaEntrada: e.entryTime,   // Date object → interceptor → "DD/MM/YYYY HH:mm:ss"
        horaSalida: e.exitTime,
        duracion: formatDuration(totalMinutes),
        monto: e.amountPaid ?? 0,
      };
    });

    const cobrosMensualidades = pagosMensualidadesRaw.map((p) => ({
      placa: p.plate,
      tipo: 'Mensualidad',
      esMensualidad: true,
      horaEntrada: p.paidAt,
      horaSalida: p.paidAt,
      duracion: 'Pago mensual',
      monto: Number(p.price),
    }));

    return {
      fecha,
      totalCOP,
      totalVehiculos,
      visitantes,
      mensualidades,
      ingresosMensualidades,
      desglosePorHora,
      cobros: [...cobros, ...cobrosMensualidades],
    };
  }
}
