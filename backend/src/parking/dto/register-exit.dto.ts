import { IsInt, IsNotEmpty, IsString, Length, Min } from 'class-validator';

export class RegisterExitDto {
  @IsInt()
  @Min(1)
  tenantId: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 10)
  plate: string;
}
