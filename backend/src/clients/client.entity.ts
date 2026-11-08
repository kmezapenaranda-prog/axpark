import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
}

@Entity('clients')
@Index(['tenantId', 'document'], { unique: true })
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Tenant, { eager: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'full_name', length: 150 })
  fullName: string;

  @Column({ length: 20 })
  document: string;

  @Column({ length: 20, nullable: true })
  phone: string | null;

  @Column({ nullable: true })
  email: string | null;

  @Column({ nullable: true })
  address: string | null;

  @Column({ type: 'enum', enum: ClientStatus, default: ClientStatus.ACTIVE })
  status: ClientStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
