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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../common/tenant-scope';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiBearerAuth()
@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@TenantId() tenantId: number, @Body() dto: CreateClientDto) {
    return this.clientsService.create({ ...dto, tenantId });
  }

  @Get()
  findAll(@TenantId() tenantId: number) {
    return this.clientsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @TenantId() tenantId: number) {
    return this.clientsService.findOne(id, tenantId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDto,
    @TenantId() tenantId: number,
  ) {
    return this.clientsService.update(id, dto, tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number, @TenantId() tenantId: number) {
    return this.clientsService.remove(id, tenantId);
  }
}
