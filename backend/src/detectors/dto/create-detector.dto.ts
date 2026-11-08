import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateDetectorDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @Length(2, 80, { message: 'El nombre debe tener entre 2 y 80 caracteres' })
  name: string;

  /** Solo lo usa el admin de plataforma; para el resto se toma del token. */
  @IsOptional()
  @IsInt()
  @Min(1)
  tenantId?: number;
}
