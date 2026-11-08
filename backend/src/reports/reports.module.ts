import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Entry } from '../parking/entry.entity';
import { Membership } from '../memberships/membership.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Client } from '../clients/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Entry, Membership, Vehicle, Client])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
