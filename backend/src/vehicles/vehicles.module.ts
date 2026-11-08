import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from './vehicle.entity';
import { Membership } from '../memberships/membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Membership])],
  controllers: [VehiclesController],
  providers: [VehiclesService],
})
export class VehiclesModule {}
