import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsInt() @Min(0) fraccionCarro?: number;
  @IsOptional() @IsInt() @Min(0) horaCarro?: number;
  @IsOptional() @IsInt() @Min(0) medioDiaCarro?: number;
  @IsOptional() @IsInt() @Min(0) diaCarro?: number;
  @IsOptional() @IsInt() @Min(0) mensualidadCarro?: number;
  @IsOptional() @IsInt() @Min(0) fraccionMoto?: number;
  @IsOptional() @IsInt() @Min(0) horaMoto?: number;
  @IsOptional() @IsInt() @Min(0) medioDiaMoto?: number;
  @IsOptional() @IsInt() @Min(0) diaMoto?: number;
  @IsOptional() @IsInt() @Min(0) mensualidadMoto?: number;
}
