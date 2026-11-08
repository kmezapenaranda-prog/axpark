import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from './tenant.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async create(dto: CreateTenantDto): Promise<Tenant> {
    const name = dto.name.trim();
    const existing = await this.tenantRepo.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException(`Ya existe un negocio con el nombre "${name}"`);
    }
    const tenant = this.tenantRepo.create({
      name,
      contactEmail: dto.contactEmail ?? null,
      contactPhone: dto.contactPhone ?? null,
      status: dto.status,
    });
    return this.tenantRepo.save(tenant);
  }

  findAll(): Promise<Tenant[]> {
    return this.tenantRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ where: { id } });
    if (!tenant) throw new NotFoundException(`Negocio ${id} no encontrado`);
    return tenant;
  }

  async update(id: number, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findOne(id);
    Object.assign(tenant, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.contactEmail !== undefined && { contactEmail: dto.contactEmail }),
      ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    return this.tenantRepo.save(tenant);
  }

  async deactivate(id: number): Promise<void> {
    await this.findOne(id);
    await this.tenantRepo.update(id, { status: TenantStatus.INACTIVE });
  }
}
