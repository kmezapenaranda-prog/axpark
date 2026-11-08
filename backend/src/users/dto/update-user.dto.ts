import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { UserRole, UserStatus } from '../user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  fullName?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'El rol debe ser platform_admin, business_admin u operator' })
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'El estado debe ser active o inactive' })
  status?: UserStatus;
}
