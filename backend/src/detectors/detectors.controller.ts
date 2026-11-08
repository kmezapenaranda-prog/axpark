import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AllowDetectorKey } from '../common/decorators/public.decorator';
import { TenantId } from '../common/tenant-scope';
import { UserRole } from '../users/user.entity';
import { CreateDetectorDto } from './dto/create-detector.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { DetectorsService } from './detectors.service';

// Gestionan detectores el admin de plataforma (cualquier negocio) y el admin de cada negocio (el suyo).
@ApiBearerAuth()
@ApiTags('detectors')
@Roles(UserRole.PLATFORM_ADMIN, UserRole.BUSINESS_ADMIN)
@Controller('detectors')
export class DetectorsController {
  constructor(private readonly detectorsService: DetectorsService) {}

  @Get()
  findAll(@TenantId() tenantId: number) {
    return this.detectorsService.findByTenant(tenantId);
  }

  /** Respuesta incluye `key`: la clave en claro, que no se vuelve a mostrar. */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@TenantId() tenantId: number, @Body() dto: CreateDetectorDto) {
    const { detector, key } = await this.detectorsService.create(tenantId, dto.name);
    return { ...detector, key };
  }

  /**
   * Latido del detector (cada minuto): solo sirve para que el panel sepa que sigue conectado.
   * La autenticación por clave ya actualiza last_seen_at.
   */
  @AllowDetectorKey()
  @Roles(UserRole.OPERATOR)
  @Post('heartbeat')
  @HttpCode(HttpStatus.NO_CONTENT)
  heartbeat(@CurrentUser() user: JwtPayload) {
    if (!user.email.startsWith('detector:')) {
      throw new ForbiddenException('Solo los detectores envían latidos');
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(@Param('id', ParseIntPipe) id: number, @TenantId() tenantId: number) {
    return this.detectorsService.revoke(id, tenantId);
  }
}
