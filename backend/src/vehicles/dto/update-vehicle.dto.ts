import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { VehicleStatus, VehicleType } from '../vehicle.entity';

export class UpdateVehicleDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  clientId?: number;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9]{3,10}$/)
  plate?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @IsOptional()
  @IsString()
  @Length(1, 50)
  brand?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  color?: string;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;
}
