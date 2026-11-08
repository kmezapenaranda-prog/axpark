import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../common/tenant-scope';
import { ReportsService } from './reports.service';

@ApiBearerAuth()
@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('caja')
  getCaja(@Query('fecha') fecha: string, @TenantId() tenantId: number) {
    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      throw new BadRequestException('Parámetro fecha requerido (formato: YYYY-MM-DD)');
    }
    return this.reportsService.getCajaReport(fecha, tenantId);
  }

  @Get('summary')
  getSummary(@TenantId() tenantId: number) {
    return this.reportsService.getSummary(tenantId);
  }
}
