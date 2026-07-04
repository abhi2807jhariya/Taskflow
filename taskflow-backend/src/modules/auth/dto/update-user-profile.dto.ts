import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, {
    message: 'Full name must be at least 2 characters.',
  })
  @MaxLength(100, {
    message: 'Full name cannot exceed 100 characters.',
  })
  fullName?: string;

  @IsOptional()
  @IsEmail(
    {},
    {
      message: 'Please enter a valid email address.',
    },
  )
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(10, {
    message: 'Mobile number must be at least 10 digits.',
  })
  @MaxLength(15, {
    message: 'Mobile number cannot exceed 15 digits.',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  profileImage?: string | null;
}
