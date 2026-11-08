import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

export class RegisterEntryDto {
  /** Opcional: para usuarios se toma del token; los detectores lo deducen de su clave. */
  @IsOptional()
  @IsInt()
  @Min(1)
  tenantId?: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  plate: string;

  @IsOptional()
  @IsIn(['car', 'moto'])
  vehicleType?: 'car' | 'moto';

  /**
   * Hora en que el detector vio la placa (ISO 8601). Solo se respeta si la envía un
   * detector: permite registrar con su hora real las placas que guardó mientras no
   * había internet. A un usuario se le ignora (la hora de entrada es la del servidor).
   */
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'detectedAt debe ser una fecha ISO 8601' })
  detectedAt?: string;
}
