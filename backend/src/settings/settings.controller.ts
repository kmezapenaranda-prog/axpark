import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TenantId } from '../common/tenant-scope';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiBearerAuth()
@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(@TenantId() tenantId: number) {
    return this.settingsService.get(tenantId);
  }

  @Roles(UserRole.BUSINESS_ADMIN, UserRole.PLATFORM_ADMIN)
  @Put()
  update(@TenantId() tenantId: number, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.upsert(tenantId, dto);
  }
}
