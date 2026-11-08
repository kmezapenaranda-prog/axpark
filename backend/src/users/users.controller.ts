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
  ClassSerializerInterceptor,
  UseInterceptors,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserRole } from './user.entity';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { resolveTenantId } from '../common/tenant-scope';
import { JwtPayload } from '../auth/jwt-payload.interface';

// platform_admin gestiona todos los usuarios; business_admin solo los de su negocio
// y nunca puede crear ni asignar el rol platform_admin.
@ApiBearerAuth()
@ApiTags('users')
@Roles(UserRole.PLATFORM_ADMIN, UserRole.BUSINESS_ADMIN)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private isPlatformAdmin(user: JwtPayload): boolean {
    return user.role === UserRole.PLATFORM_ADMIN;
  }

  private assertRoleAllowed(user: JwtPayload, role?: UserRole) {
    if (role === UserRole.PLATFORM_ADMIN && !this.isPlatformAdmin(user)) {
      throw new ForbiddenException('No puedes asignar el rol platform_admin');
    }
  }

  /** Carga el usuario objetivo y verifica que el solicitante pueda gestionarlo. */
  private async findManageable(id: number, user: JwtPayload) {
    const target = await this.usersService.findOne(id);
    if (!this.isPlatformAdmin(user) && target.tenantId !== user.tenantId) {
      throw new ForbiddenException('No tienes acceso a este usuario');
    }
    if (!this.isPlatformAdmin(user) && target.role === UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('No tienes acceso a este usuario');
    }
    return target;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    this.assertRoleAllowed(user, dto.role);
    // Un platform_admin nuevo no pertenece a ningún negocio.
    const tenantId =
      this.isPlatformAdmin(user) && dto.role === UserRole.PLATFORM_ADMIN
        ? undefined
        : resolveTenantId(user, dto.tenantId);
    return this.usersService.create({ ...dto, tenantId });
  }

  @Get()
  findAll(@Query('tenantId') tenantId: string | undefined, @CurrentUser() user: JwtPayload) {
    if (this.isPlatformAdmin(user) && tenantId === undefined) {
      return this.usersService.findAll();
    }
    return this.usersService.findByTenant(resolveTenantId(user, tenantId));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    return this.findManageable(id, user);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    this.assertRoleAllowed(user, dto.role);
    await this.findManageable(id, user);
    return this.usersService.update(id, dto);
  }

  // Restablecer contraseña: mismas reglas de acceso que editar el usuario.
  @Put(':id/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.findManageable(id, user);
    await this.usersService.setPassword(id, dto.password);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: JwtPayload) {
    await this.findManageable(id, user);
    return this.usersService.deactivate(id);
  }
}
