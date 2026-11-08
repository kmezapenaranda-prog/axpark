import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('tenants')
@Index(['name'], { unique: true })
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ name: 'contact_email', nullable: true })
  contactEmail: string | null;

  @Column({ name: 'contact_phone', length: 20, nullable: true })
  contactPhone: string | null;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.ACTIVE })
  status: TenantStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
