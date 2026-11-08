import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle, VehicleStatus } from './vehicle.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Membership, MembershipStatus } from '../memberships/membership.entity';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
  ) {}

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const plate = dto.plate.toUpperCase();
    const existing = await this.vehicleRepo.findOne({
      where: { tenantId: dto.tenantId, plate },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException(`Ya existe un vehículo con la placa ${plate}`);
    }
    const vehicle = this.vehicleRepo.create({
      tenantId: dto.tenantId,
      clientId: dto.clientId,
      plate,
      type: dto.type,
      brand: dto.brand ?? null,
      color: dto.color ?? null,
      status: dto.status,
    });
    return this.vehicleRepo.save(vehicle);
  }

  async findAll(tenantId: number) {
    const vehicles = await this.vehicleRepo.find({
      where: { tenantId },
      relations: ['client', 'memberships'],
      order: { createdAt: 'DESC' },
    });
    return vehicles.map(({ memberships, ...v }) => ({
      ...v,
      membership:
        memberships?.find((m) => m.status === 'active') ??
        [...(memberships ?? [])].sort((a, b) => b.id - a.id)[0] ??
        null,
    }));
  }

  async findByPlate(plate: string, tenantId: number): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findOne({
      where: { plate: plate.toUpperCase(), tenantId },
    });
    if (!vehicle) throw new NotFoundException(`No se encontró vehículo con placa ${plate.toUpperCase()}`);
    return vehicle;
  }

  async update(id: number, dto: UpdateVehicleDto, tenantId: number): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException(`Vehículo ${id} no encontrado`);
    if (dto.plate) {
      const plate = dto.plate.toUpperCase();
      if (plate !== vehicle.plate) {
        const existing = await this.vehicleRepo.findOne({
          where: { tenantId, plate },
          withDeleted: true,
        });
        if (existing) throw new ConflictException(`Ya existe un vehículo con la placa ${plate}`);
        dto.plate = plate;
      }
    }
    Object.assign(vehicle, {
      ...(dto.clientId !== undefined && { clientId: dto.clientId }),
      ...(dto.plate !== undefined && { plate: dto.plate }),
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.brand !== undefined && { brand: dto.brand }),
      ...(dto.color !== undefined && { color: dto.color }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    return this.vehicleRepo.save(vehicle);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    const vehicle = await this.vehicleRepo.findOne({ where: { id, tenantId } });
    if (!vehicle) throw new NotFoundException(`Vehículo ${id} no encontrado`);
    await this.membershipRepo.update({ vehicleId: id }, { status: MembershipStatus.CANCELLED });
    await this.membershipRepo.softDelete({ vehicleId: id });
    vehicle.status = VehicleStatus.INACTIVE;
    await this.vehicleRepo.save(vehicle);
    await this.vehicleRepo.softDelete(id);
  }
}
