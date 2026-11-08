import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MembershipStatus } from '../membership.entity';

export class CreateMembershipDto {
  @IsNotEmpty({ message: 'El negocio (tenantId) es obligatorio' })
  @IsInt()
  @Min(1)
  tenantId: number;

  @IsNotEmpty({ message: 'El id del vehículo es obligatorio' })
  @IsInt()
  @Min(1)
  vehicleId: number;

  @IsNotEmpty({ message: 'El id del cliente es obligatorio' })
  @IsInt()
  @Min(1)
  clientId: number;

  @IsNotEmpty({ message: 'La fecha de inicio es obligatoria' })
  @IsDateString({}, { message: 'startDate debe ser una fecha válida (YYYY-MM-DD)' })
  startDate: string;

  @IsNotEmpty({ message: 'La fecha de fin es obligatoria' })
  @IsDateString({}, { message: 'endDate debe ser una fecha válida (YYYY-MM-DD)' })
  endDate: string;

  @IsNotEmpty({ message: 'El precio es obligatorio' })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0)
  price: number;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsEnum(MembershipStatus, { message: 'El estado debe ser active, expired o cancelled' })
  status?: MembershipStatus;

  @IsOptional()
  @IsString()
  company?: string;
}
