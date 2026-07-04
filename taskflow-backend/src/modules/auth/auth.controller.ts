import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthService } from './auth.service';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { DeleteWorkspaceDto } from './dto/delete-workspace.dto';
import { SetupDto } from './dto/setup.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    fullName: string;
    email: string;
    role: string;
  };
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('setup-status')
  setupStatus() {
    return this.authService.setupStatus();
  }

  @Post('setup')
  setup(@Body() setupDto: SetupDto) {
    return this.authService.setup(setupDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('verify-reset-otp')
  verifyResetOtp(@Body() verifyResetOtpDto: VerifyResetOtpDto) {
    return this.authService.verifyResetOtp(verifyResetOtpDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getOwnProfile(@Req() request: AuthenticatedRequest) {
    return this.authService.getUserProfile(request.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateOwnProfile(
    @Req() request: AuthenticatedRequest,
    @Body()
    updateUserProfileDto: UpdateUserProfileDto,
  ) {
    return this.authService.updateUserProfile(
      request.user.userId,
      updateUserProfileDto,
    );
  }

  @Get('profile/:id')
  getProfile(@Param('id') id: string) {
    return this.authService.getProfile(id);
  }

  @Patch('profile/:id')
  updateProfile(
    @Param('id') id: string,
    @Body()
    updateAdminProfileDto: UpdateAdminProfileDto,
  ) {
    return this.authService.updateProfile(id, updateAdminProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body()
    changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      request.user.userId,
      changePasswordDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('delete-workspace')
  deleteWorkspace(
    @Req() request: AuthenticatedRequest,
    @Body() deleteWorkspaceDto: DeleteWorkspaceDto,
  ) {
    return this.authService.deleteWorkspace(
      request.user.userId,
      deleteWorkspaceDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile-image')
  @UseInterceptors(
    FileInterceptor('profileImage', {
      storage: memoryStorage(),

      limits: {
        fileSize: 5 * 1024 * 1024,
      },

      fileFilter: (request, file, callback) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (!allowedTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Only JPG, JPEG, PNG and WebP images are allowed',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  uploadProfileImage(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Profile image is required');
    }

    return this.authService.uploadProfileImage(request.user.userId, file);
  }
}
