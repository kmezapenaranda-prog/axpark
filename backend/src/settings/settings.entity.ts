import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Tenant } from '../tenants/tenant.entity';

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', unique: true })
  tenantId: number;

  @ManyToOne(() => Tenant, { eager: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'fraccion_carro', type: 'int', default: 700 })
  fraccionCarro: number;

  @Column({ name: 'hora_carro', type: 'int', default: 2500 })
  horaCarro: number;

  @Column({ name: 'medio_dia_carro', type: 'int', default: 10000 })
  medioDiaCarro: number;

  @Column({ name: 'dia_carro', type: 'int', default: 18000 })
  diaCarro: number;

  @Column({ name: 'mensualidad_carro', type: 'int', default: 120000 })
  mensualidadCarro: number;

  @Column({ name: 'fraccion_moto', type: 'int', default: 400 })
  fraccionMoto: number;

  @Column({ name: 'hora_moto', type: 'int', default: 1500 })
  horaMoto: number;

  @Column({ name: 'medio_dia_moto', type: 'int', default: 6000 })
  medioDiaMoto: number;

  @Column({ name: 'dia_moto', type: 'int', default: 10000 })
  diaMoto: number;

  @Column({ name: 'mensualidad_moto', type: 'int', default: 70000 })
  mensualidadMoto: number;
}
