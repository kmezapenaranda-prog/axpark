import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';
import { Membership } from './membership.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Client } from '../clients/client.entity';
import { Tenant } from '../tenants/tenant.entity';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  // Vehicle/Client/Tenant se importan directo para que MembershipsService
  // pueda resolverlos sin depender de sus módulos de servicio
  imports: [TypeOrmModule.forFeature([Membership, Vehicle, Client, Tenant]), ReceiptsModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
