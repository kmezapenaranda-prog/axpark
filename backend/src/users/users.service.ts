import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserStatus } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Ya existe un usuario con el email ${dto.email}`);
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.userRepo.create({
      tenantId: dto.tenantId ?? null,
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
      status: dto.status,
    });
    return this.userRepo.save(user);
  }

  findAll(): Promise<User[]> {
    return this.userRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }

  findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  findByTenant(tenantId: number): Promise<User[]> {
    return this.userRepo.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async update(id: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, {
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.role !== undefined && { role: dto.role }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
    return this.userRepo.save(user);
  }

  /** Pone una contraseña nueva (la decide un administrador). */
  async setPassword(id: number, password: string): Promise<void> {
    await this.findOne(id);
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    await this.userRepo.update(id, { passwordHash });
  }

  async deactivate(id: number): Promise<void> {
    await this.findOne(id);
    await this.userRepo.update(id, { status: UserStatus.INACTIVE });
  }
}
