import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const { fullName, phoneNumber, email, password, confirmPassword } =
      createUserDto;

    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const normalizedPhoneNumber = phoneNumber.trim();

    const existingEmail = await this.prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (existingEmail) {
      throw new ConflictException('A user with this email already exists');
    }

    const existingPhone = await this.prisma.user.findUnique({
      where: {
        phoneNumber: normalizedPhoneNumber,
      },
    });

    if (existingPhone) {
      throw new ConflictException(
        'A user with this mobile number already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullName: fullName.trim(),
        phoneNumber: normalizedPhoneNumber,
        email: normalizedEmail,
        password: hashedPassword,
        role: 'user',
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

    let emailSent = false;

    try {
      await this.mailService.sendUserCredentials({
        to: user.email,
        fullName: user.fullName,
        loginId: user.email,
        temporaryPassword: password,
      });

      emailSent = true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown email error';

      this.logger.error(
        `Credentials email failed for user ${user.id}: ${message}`,
      );
    }

    return {
      message: emailSent
        ? 'User created and credentials sent successfully'
        : 'User created successfully, but credentials email could not be sent',

      emailSent,

      user,
    };
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      where: {
        role: 'user',
      },

      orderBy: {
        createdAt: 'desc',
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
      message: 'Users fetched successfully',
      users,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'user',
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
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User fetched successfully',
      user,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'user',
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (
      updateUserDto.email &&
      updateUserDto.email.trim().toLowerCase() !== existingUser.email
    ) {
      const emailExists = await this.prisma.user.findUnique({
        where: {
          email: updateUserDto.email.trim().toLowerCase(),
        },
      });

      if (emailExists) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    if (
      updateUserDto.phoneNumber &&
      updateUserDto.phoneNumber.trim() !== existingUser.phoneNumber
    ) {
      const phoneExists = await this.prisma.user.findUnique({
        where: {
          phoneNumber: updateUserDto.phoneNumber.trim(),
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
        id,
      },

      data: {
        ...(updateUserDto.fullName && {
          fullName: updateUserDto.fullName.trim(),
        }),

        ...(updateUserDto.email && {
          email: updateUserDto.email.trim().toLowerCase(),
        }),

        ...(updateUserDto.phoneNumber && {
          phoneNumber: updateUserDto.phoneNumber.trim(),
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
      message: 'User updated successfully',
      user: updatedUser,
    };
  }

  async updateStatus(id: string, updateUserStatusDto: UpdateUserStatusDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'user',
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id,
      },

      data: {
        status: updateUserStatusDto.status,
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
      message:
        updateUserStatusDto.status === 'active'
          ? 'User activated successfully'
          : 'User deactivated successfully',

      user: updatedUser,
    };
  }

  async remove(id: string) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'user',
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: {
        id,
      },
    });

    return {
      message: 'User deleted successfully',
    };
  }
}
