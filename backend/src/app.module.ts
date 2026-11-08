import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from './clients/clients.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { MembershipsModule } from './memberships/memberships.module';
import { ParkingModule } from './parking/parking.module';
import { SettingsModule } from './settings/settings.module';
import { ReportsModule } from './reports/reports.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { buildTypeOrmOptions } from './database/typeorm.config';
import { DetectorsModule } from './detectors/detectors.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(buildTypeOrmOptions()),
    ClientsModule,
    VehiclesModule,
    MembershipsModule,
    ParkingModule,
    SettingsModule,
    ReportsModule,
    TenantsModule,
    UsersModule,
    AuthModule,
    HealthModule,
    DetectorsModule,
  ],
  providers: [
    // Orden importa: primero autenticación (JWT), luego roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
