import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { Client } from '../clients/client.entity';
import { Membership } from '../memberships/membership.entity';
import { Tenant } from '../tenants/tenant.entity';

export enum VehicleType {
  CAR = 'car',
  MOTO = 'moto',
}

export enum VehicleStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('vehicles')
@Index(['tenantId', 'plate'], { unique: true })
export class Vehicle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Tenant, { eager: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'client_id', nullable: true })
  clientId: number | null;

  @Column({ length: 10 })
  plate: string;

  @Column({ type: 'enum', enum: VehicleType })
  type: VehicleType;

  @Column({ length: 50, nullable: true })
  brand: string | null;

  @Column({ length: 30, nullable: true })
  color: string | null;

  @Column({ type: 'enum', enum: VehicleStatus, default: VehicleStatus.ACTIVE })
  status: VehicleStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @ManyToOne(() => Client, { eager: false, nullable: true })
  @JoinColumn({ name: 'client_id' })
  client: Client | null;

  @OneToMany(() => Membership, (m) => m.vehicle, { eager: false })
  memberships: Membership[];
}
