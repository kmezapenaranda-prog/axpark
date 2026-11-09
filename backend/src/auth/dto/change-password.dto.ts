import { IsNotEmpty, IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Escribe tu contraseña actual' })
  @IsString()
  currentPassword: string;

  @IsNotEmpty({ message: 'Escribe la contraseña nueva' })
  @IsString()
  @Length(8, 100, { message: 'La contraseña nueva debe tener al menos 8 caracteres' })
  newPassword: string;
}
