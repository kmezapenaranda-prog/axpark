import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { ClientStatus } from '../client.entity';

export class CreateClientDto {
  @IsNotEmpty({ message: 'El negocio (tenantId) es obligatorio' })
  @IsInt()
  @Min(1)
  tenantId: number;

  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  @IsString()
  @Length(2, 150)
  fullName: string;

  @IsNotEmpty({ message: 'El documento es obligatorio' })
  @IsString()
  @Length(5, 20)
  @Matches(/^[0-9A-Za-z\-]+$/, { message: 'El documento solo puede contener letras, números y guiones' })
  document: string;

  @IsOptional()
  @IsString()
  @Length(7, 20)
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(ClientStatus, { message: 'El estado debe ser active, inactive o blocked' })
  status?: ClientStatus;
}
