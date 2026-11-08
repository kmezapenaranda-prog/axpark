import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../common/tenant-scope';
import { Response } from 'express';
import { MembershipsService } from './memberships.service';
import { CreateMembershipDto } from './dto/create-membership.dto';

@ApiBearerAuth()
@ApiTags('memberships')
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@TenantId() tenantId: number, @Body() dto: CreateMembershipDto) {
    return this.membershipsService.create({ ...dto, tenantId });
  }

  @Get()
  findAll(@TenantId() tenantId: number) {
    return this.membershipsService.findAll(tenantId);
  }

  // Ruta fija debe ir antes de la ruta dinámica al mismo nivel
  @Get('expiring')
  findExpiring(@TenantId() tenantId: number) {
    return this.membershipsService.findExpiring(tenantId);
  }

  @Get(':plate/status')
  getStatus(@Param('plate') plate: string, @TenantId() tenantId: number) {
    return this.membershipsService.getStatusByPlate(plate, tenantId);
  }

  @Put(':id/renew')
  renew(@Param('id', ParseIntPipe) id: number, @TenantId() tenantId: number) {
    return this.membershipsService.renew(id, tenantId);
  }

  @Get(':id/receipt')
  async getReceipt(
    @Param('id', ParseIntPipe) id: number,
    @TenantId() tenantId: number,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.membershipsService.getReceiptPdf(tenantId, id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @TenantId() tenantId: number) {
    return this.membershipsService.remove(id, tenantId);
  }
}
