import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { VehicleStatus, VehicleType } from '../vehicle.entity';

export class CreateVehicleDto {
  @IsNotEmpty({ message: 'El negocio (tenantId) es obligatorio' })
  @IsInt()
  @Min(1)
  tenantId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  clientId?: number;

  @IsNotEmpty({ message: 'La placa es obligatoria' })
  @IsString()
  @Matches(/^[A-Za-z0-9]{3,10}$/, { message: 'La placa debe tener entre 3 y 10 caracteres alfanuméricos' })
  plate: string;

  @IsNotEmpty({ message: 'El tipo de vehículo es obligatorio' })
  @IsEnum(VehicleType, { message: 'El tipo debe ser car, moto o truck' })
  type: VehicleType;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  brand?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  color?: string;

  @IsOptional()
  @IsEnum(VehicleStatus, { message: 'El estado debe ser active o inactive' })
  status?: VehicleStatus;
}
