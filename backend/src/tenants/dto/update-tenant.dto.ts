import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { TenantStatus } from '../tenant.entity';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email de contacto debe ser válido' })
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @Length(7, 20)
  contactPhone?: string;

  @IsOptional()
  @IsEnum(TenantStatus, { message: 'El estado debe ser active o inactive' })
  status?: TenantStatus;
}
