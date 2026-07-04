import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class SetupDto {
  @IsString()
  @IsNotEmpty()
  systemName!: string;

  @IsString()
  @IsNotEmpty()
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  adminPassword!: string;

  @IsOptional()
  @IsString()
  profileImage?: string | null;

  @IsString()
  @IsNotEmpty()
  setupCode!: string;
}
