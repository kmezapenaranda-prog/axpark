import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Membership } from '../memberships/membership.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepo: Repository<Vehicle>,
    @InjectRepository(Membership)
    private readonly membershipRepo: Repository<Membership>,
  ) {}

  async create(dto: CreateClientDto): Promise<Client> {
    const existing = await this.clientRepo.findOne({
      where: { tenantId: dto.tenantId, document: dto.document },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException(`Ya existe un cliente con el documento ${dto.document}`);
    }
    const client = this.clientRepo.create({
      tenantId: dto.tenantId,
      fullName: dto.fullName,
      document: dto.document,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      address: dto.address ?? null,
      status: dto.status,
    });
    return this.clientRepo.save(client);
  }

  findAll(tenantId: number): Promise<Client[]> {
    return this.clientRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: number, tenantId: number): Promise<Client> {
    const client = await this.clientRepo.findOne({ where: { id, tenantId } });
    if (!client) throw new NotFoundException(`Cliente ${id} no encontrado`);
    return client;
  }

  async update(id: number, dto: UpdateClientDto, tenantId: number): Promise<Client> {
    const client = await this.findOne(id, tenantId);
    if (dto.document && dto.document !== client.document) {
      const existing = await this.clientRepo.findOne({
        where: { tenantId, document: dto.document },
        withDeleted: true,
      });
      if (existing) {
        throw new ConflictException(`Ya existe un cliente con el documento ${dto.document}`);
      }
    }
    Object.assign(client, {
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.document !== undefined && { document: dto.document }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    return this.clientRepo.save(client);
  }

  async remove(id: number, tenantId: number): Promise<void> {
    await this.findOne(id, tenantId);
    await this.membershipRepo.softDelete({ clientId: id });
    await this.vehicleRepo.softDelete({ clientId: id });
    await this.clientRepo.softDelete(id);
  }
}
