import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../common/tenant-scope';
import { Response } from 'express';
import { ParkingService } from './parking.service';
import { RegisterEntryDto } from './dto/register-entry.dto';
import { RegisterExitDto } from './dto/register-exit.dto';
import { AllowDetectorKey } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';

@ApiBearerAuth()
@ApiTags('parking')
@Controller('parking')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  // También la usa el detector de placas con su clave (header x-detector-key).
  @AllowDetectorKey()
  @Post('entry')
  registerEntry(
    @TenantId() tenantId: number,
    @Body() dto: RegisterEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const fromDetector = user.sub === 0 && user.email.startsWith('detector:');
    const detectedAt = fromDetector && dto.detectedAt ? new Date(dto.detectedAt) : undefined;
    return this.parkingService.registerEntry(tenantId, dto.plate, dto.vehicleType, detectedAt);
  }

  @Post('exit')
  registerExit(@TenantId() tenantId: number, @Body() dto: RegisterExitDto) {
    return this.parkingService.registerExit(tenantId, dto.plate);
  }

  @Get('active')
  getActive(@TenantId() tenantId: number) {
    return this.parkingService.getActive(tenantId);
  }

  @Get('entries')
  getEntries(@TenantId() tenantId: number) {
    return this.parkingService.getEntries(tenantId);
  }

  @Get('status/:plate')
  getStatus(@Param('plate') plate: string, @TenantId() tenantId: number) {
    return this.parkingService.getStatus(tenantId, plate);
  }

  @Get('entries/:id/receipt')
  async getExitReceipt(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() tenantId: number,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.parkingService.getExitReceiptPdf(tenantId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  // Solo para desarrollo — elimina todos los ingresos abiertos sin salida (de TODOS los negocios)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete('cleanup')
  cleanupOpenEntries() {
    return this.parkingService.cleanupOpenEntries();
  }

  // Solo para desarrollo — elimina todos los registros de mensualidades (de TODOS los negocios)
  @Roles(UserRole.PLATFORM_ADMIN)
  @Delete('cleanup-memberships')
  cleanupAllMemberships() {
    return this.parkingService.cleanupAllMemberships();
  }
}
