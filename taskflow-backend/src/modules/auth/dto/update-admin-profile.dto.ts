import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class UpdateAdminProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3, {
    message: 'Full name must contain at least 3 characters',
  })
  fullName?: string;

  @IsOptional()
  @IsEmail(
    {},
    {
      message: 'Please enter a valid email address',
    },
  )
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9]{10}$/, {
    message: 'Mobile number must contain exactly 10 digits',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  profileImage?: string | null;
}
