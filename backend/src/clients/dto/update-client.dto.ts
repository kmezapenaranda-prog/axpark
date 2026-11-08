import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { ClientStatus } from '../client.entity';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  fullName?: string;

  @IsOptional()
  @IsString()
  @Length(5, 20)
  @Matches(/^[0-9A-Za-z\-]+$/)
  document?: string;

  @IsOptional()
  @IsString()
  @Length(7, 20)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;
}
