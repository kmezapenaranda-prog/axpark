import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { UserRole, UserStatus } from '../user.entity';

export class CreateUserDto {
  @IsOptional()
  @IsInt()
  tenantId?: number;

  @IsEmail({}, { message: 'El email debe ser válido' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString()
  @Length(8, 100, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  @IsString()
  @Length(2, 150)
  fullName: string;

  @IsEnum(UserRole, { message: 'El rol debe ser platform_admin, business_admin u operator' })
  role: UserRole;

  @IsOptional()
  @IsEnum(UserStatus, { message: 'El estado debe ser active o inactive' })
  status?: UserStatus;
}
