import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParkingController } from './parking.controller';
import { ParkingService } from './parking.service';
import { Entry } from './entry.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { Tenant } from '../tenants/tenant.entity';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Entry, Vehicle, Tenant]),
    MembershipsModule,
    NotificationsModule,
    SettingsModule,
    ReceiptsModule,
  ],
  controllers: [ParkingController],
  providers: [ParkingService],
})
export class ParkingModule {}
