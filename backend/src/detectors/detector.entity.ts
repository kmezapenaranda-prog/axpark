import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

export enum DetectorStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

/**
 * Un detector de placas instalado en un parqueadero (un PC con cámara).
 * Cada uno tiene su propia clave, ligada a UN negocio: el backend deduce el
 * parqueadero de la clave, así que una clave nunca puede escribir en otro negocio.
 * Solo se guarda el hash SHA-256 de la clave; la clave en claro se muestra una vez al crearla.
 */
@Entity('detectors')
export class Detector {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id' })
  tenantId: number;

  @ManyToOne(() => Tenant, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ length: 80 })
  name: string;

  /** Primeros caracteres de la clave, para reconocerla en el panel sin exponerla. */
  @Column({ name: 'key_prefix', length: 16 })
  keyPrefix: string;

  @Index({ unique: true })
  @Column({ name: 'key_hash', length: 64, select: false })
  keyHash: string;

  @Column({ type: 'enum', enum: DetectorStatus, default: DetectorStatus.ACTIVE })
  status: DetectorStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  /** Última vez que el detector envió algo: sirve para ver si sigue conectado. */
  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;
}
