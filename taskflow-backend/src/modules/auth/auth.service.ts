import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';

import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UpdateAdminProfileDto } from './dto/update-admin-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { DeleteWorkspaceDto } from './dto/delete-workspace.dto';
import { SetupDto } from './dto/setup.dto';
import { VerifyResetOtpDto } from './dto/verify-reset-otp.dto';

import { unlink, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const PASSWORD_RESET_RESPONSE_MESSAGE =
  'If this email exists, a password reset OTP has been sent.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private generateOtp() {
    return randomBytes(3).readUIntBE(0, 3).toString().padStart(8, '0').slice(0, 6);
  }

  private getFrontendUrl() {
    return (
      process.env.FRONTEND_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  async setupStatus() {
    try {
      const adminCount = await this.prisma.user.count();

      return {
        isSetupDone: adminCount > 0,
      };
    } catch (error) {
      console.error('SETUP STATUS ERROR =>', error);
      throw error;
    }
  }

  async setup(setupDto: SetupDto) {
    try {
      const {
        systemName,
        adminName,
        adminEmail,
        adminPassword,
        profileImage,
        setupCode,
      } = setupDto;

      const adminCount = await this.prisma.user.count();

      if (adminCount > 0) {
        throw new BadRequestException('Setup already completed');
      }

      const privateSetupCode = process.env.TASKFLOW_SETUP_SECRET;

      if (!privateSetupCode) {
        throw new BadRequestException('Setup secret is not configured');
      }

      if (setupCode !== privateSetupCode) {
        throw new UnauthorizedException('Invalid private setup code');
      }

      const normalizedEmail = adminEmail.trim().toLowerCase();

      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const admin = await this.prisma.user.create({
        data: {
          fullName: adminName.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          profileImage: profileImage || null,
          role: 'admin',
          status: 'active',
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          profileImage: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await this.prisma.systemSetting.create({
        data: {
          appName: systemName.trim() || 'TaskFlow',
          isSetupDone: true,
        },
      });

      return {
        message: 'Setup completed successfully',
        user: admin,
      };
    } catch (error) {
      console.error('SETUP ERROR =>', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const normalizedEmail = loginDto.email.trim().toLowerCase();
      const password = loginDto.password;

      const user = await this.prisma.user.findUnique({
        where: {
          email: normalizedEmail,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (user.status === 'inactive') {
        throw new UnauthorizedException('Your account is inactive');
      }

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      return {
        message: 'Login successful',
        accessToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          profileImage: user.profileImage,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      };
    } catch (error) {
      console.error('LOGIN ERROR =>', error);
      throw error;
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const normalizedEmail = forgotPasswordDto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
      },
    });

    if (!user || user.status === 'inactive') {
      return {
        message: PASSWORD_RESET_RESPONSE_MESSAGE,
      };
    }

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const resetToken = randomBytes(32).toString('hex');
    const otp = this.generateOtp();
    const tokenHash = this.hashResetToken(resetToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        otpHash: this.hashResetToken(otp),
        userId: user.id,
        expiresAt,
      },
    });

    let emailSent = false;

    try {
      await this.mailService.sendPasswordResetOtp({
        to: user.email,
        fullName: user.fullName,
        otp,
        expiresAt,
      });

      emailSent = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown email error';

      this.logger.warn(`Password reset email was not sent: ${message}`);
    }

    const response: {
      message: string;
      otp?: string;
    } = {
      message: PASSWORD_RESET_RESPONSE_MESSAGE,
    };

    if (!emailSent && process.env.NODE_ENV !== 'production') {
      response.otp = otp;
    }

    return response;
  }

  async verifyResetOtp(verifyResetOtpDto: VerifyResetOtpDto) {
    const normalizedEmail = verifyResetOtpDto.email.trim().toLowerCase();
    const otp = verifyResetOtpDto.otp.trim();

    const user = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!user || user.status === 'inactive') {
      throw new BadRequestException('OTP is invalid or expired');
    }

    const resetRequest = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        otpHash: this.hashResetToken(otp),
        usedAt: null,
        verifiedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!resetRequest) {
      throw new BadRequestException('OTP is invalid or expired');
    }

    await this.prisma.passwordResetToken.update({
      where: {
        id: resetRequest.id,
      },
      data: {
        verifiedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'OTP verified successfully',
      resetToken: resetRequest.tokenHash,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const token = resetPasswordDto.token.trim();
    const password = resetPasswordDto.password;
    const confirmPassword = resetPasswordDto.confirmPassword;

    if (password !== confirmPassword) {
      throw new BadRequestException('Password and confirm password do not match');
    }

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        OR: [
          {
            tokenHash: this.hashResetToken(token),
          },
          {
            tokenHash: token,
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      !resetToken.verifiedAt ||
      resetToken.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Reset link is invalid or expired');
    }

    if (resetToken.user.status === 'inactive') {
      throw new UnauthorizedException('Your account is inactive');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const usedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: resetToken.user.id,
        },
        data: {
          password: hashedPassword,
        },
      }),

      this.prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt,
        },
      }),

      this.prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.user.id,
          usedAt: null,
          id: {
            not: resetToken.id,
          },
        },
        data: {
          usedAt,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Password reset successfully',
    };
  }

  async getProfile(id: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'admin',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin profile not found');
    }

    return {
      message: 'Admin profile fetched successfully',
      user: admin,
    };
  }

  async updateProfile(
    id: string,
    updateAdminProfileDto: UpdateAdminProfileDto,
  ) {
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'admin',
      },
    });

    if (!existingAdmin) {
      throw new NotFoundException('Admin profile not found');
    }

    const normalizedEmail = updateAdminProfileDto.email?.trim().toLowerCase();

    const normalizedPhone = updateAdminProfileDto.phoneNumber?.trim();

    if (normalizedEmail && normalizedEmail !== existingAdmin.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id,
          },
        },
      });

      if (emailExists) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    if (normalizedPhone && normalizedPhone !== existingAdmin.phoneNumber) {
      const phoneExists = await this.prisma.user.findFirst({
        where: {
          phoneNumber: normalizedPhone,
          NOT: {
            id,
          },
        },
      });

      if (phoneExists) {
        throw new ConflictException(
          'A user with this mobile number already exists',
        );
      }
    }

    const updatedAdmin = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        ...(updateAdminProfileDto.fullName !== undefined && {
          fullName: updateAdminProfileDto.fullName.trim(),
        }),

        ...(normalizedEmail !== undefined && {
          email: normalizedEmail,
        }),

        ...(normalizedPhone !== undefined && {
          phoneNumber: normalizedPhone,
        }),

        ...(updateAdminProfileDto.profileImage !== undefined && {
          profileImage: updateAdminProfileDto.profileImage || null,
        }),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Admin profile updated successfully',
      user: updatedAdmin,
    };
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    return {
      message: 'User profile fetched successfully',
      user,
    };
  }

  async updateUserProfile(
    userId: string,
    updateUserProfileDto: UpdateUserProfileDto,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User profile not found');
    }

    const normalizedFullName =
      updateUserProfileDto.fullName !== undefined
        ? updateUserProfileDto.fullName.trim()
        : undefined;

    const normalizedEmail =
      updateUserProfileDto.email !== undefined
        ? updateUserProfileDto.email.trim().toLowerCase()
        : undefined;

    const normalizedPhone =
      updateUserProfileDto.phoneNumber !== undefined
        ? updateUserProfileDto.phoneNumber?.trim() || null
        : undefined;

    if (normalizedEmail && normalizedEmail !== existingUser.email) {
      const emailExists = await this.prisma.user.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id: userId,
          },
        },
      });

      if (emailExists) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    if (normalizedPhone && normalizedPhone !== existingUser.phoneNumber) {
      const phoneExists = await this.prisma.user.findFirst({
        where: {
          phoneNumber: normalizedPhone,
          NOT: {
            id: userId,
          },
        },
      });

      if (phoneExists) {
        throw new ConflictException(
          'A user with this mobile number already exists',
        );
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        ...(normalizedFullName !== undefined && {
          fullName: normalizedFullName,
        }),

        ...(normalizedEmail !== undefined && {
          email: normalizedEmail,
        }),

        ...(normalizedPhone !== undefined && {
          phoneNumber: normalizedPhone,
        }),

        ...(updateUserProfileDto.profileImage !== undefined && {
          profileImage: updateUserProfileDto.profileImage || null,
        }),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    if (user.status === 'inactive') {
      throw new UnauthorizedException('Your account is inactive');
    }

    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'New password and confirm password do not match',
      );
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSameAsCurrentPassword = await bcrypt.compare(
      newPassword,
      user.password,
    );

    if (isSameAsCurrentPassword) {
      throw new BadRequestException(
        'New password must be different from the current password',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        password: hashedPassword,
      },
    });

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async uploadProfileImage(userId: string, file: Express.Multer.File) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const folderName = user.role.toLowerCase() === 'admin' ? 'admin' : 'user';

    const safeFullName = user.fullName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const extension =
      extname(file.originalname).toLowerCase() ||
      getImageExtension(file.mimetype);

    const fileName = `${safeFullName}-${user.id}-${Date.now()}${extension}`;

    const filePath = join(process.cwd(), 'uploads', folderName, fileName);

    await writeFile(filePath, file.buffer);

    const profileImagePath = `/uploads/${folderName}/${fileName}`;

    const oldProfileImage = user.profileImage;

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        profileImage: profileImagePath,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        profileImage: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (oldProfileImage?.startsWith('/uploads/')) {
      const oldImagePath = join(
        process.cwd(),
        oldProfileImage.replace(/^\/+/, ''),
      );

      try {
        await unlink(oldImagePath);
      } catch {
        // Old image missing ho to request fail nahi hogi.
      }
    }

    return {
      success: true,
      message: 'Profile image updated successfully',
      user: updatedUser,
    };
  }

  async deleteWorkspace(
    userId: string,
    deleteWorkspaceDto: DeleteWorkspaceDto,
  ) {
    const { currentPassword, confirmationText } = deleteWorkspaceDto;

    const admin = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin account not found');
    }

    if (admin.role.toLowerCase() !== 'admin') {
      throw new ForbiddenException('Only an admin can delete the workspace');
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      admin.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (confirmationText !== 'DELETE TASKFLOW') {
      throw new BadRequestException('Invalid confirmation text');
    }

    await this.prisma.$transaction(async (transaction) => {
      // Pehle normal users delete honge.
      await transaction.user.deleteMany({
        where: {
          id: {
            not: userId,
          },
        },
      });

      // Application settings delete hongi.
      await transaction.systemSetting.deleteMany();

      // Admin sabse last me delete hoga.
      await transaction.user.delete({
        where: {
          id: userId,
        },
      });
    });

    return {
      success: true,
      message: 'TaskFlow workspace deleted successfully',
    };
  }
}

function getImageExtension(mimeType: string): string {
  if (mimeType === 'image/png') {
    return '.png';
  }

  if (mimeType === 'image/webp') {
    return '.webp';
  }

  return '.jpg';
}
