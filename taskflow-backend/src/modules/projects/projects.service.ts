import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateMyProjectStatusDto } from './dto/update-my-project-status.dto';

type AuthenticatedProjectUser = {
  userId: string;
  role: string;
};

type ProjectStatus =
  | 'planning'
  | 'in_progress'
  | 'pending'
  | 'completed'
  | 'admin_hold';

const projectInclude = {
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
    },
  },

  tasks: {
    select: {
      id: true,
      title: true,
      assignedTo: {
        select: {
          id: true,
          fullName: true,
          email: true,
          phoneNumber: true,
          profileImage: true,
          status: true,
        },
      },
    },
  },
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyAdmin(adminId: string) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: 'admin',
        status: 'active',
      },
      select: {
        id: true,
      },
    });

    if (!admin) {
      throw new ForbiddenException('Only an active admin can manage projects');
    }
  }

  private normalizeProjectStatus(status?: string | null): ProjectStatus {
    if (status === 'in_progress' || status === 'active') {
      return 'in_progress';
    }

    if (status === 'pending') {
      return 'pending';
    }

    if (status === 'completed') {
      return 'completed';
    }

    if (
      status === 'admin_hold' ||
      status === 'on_hold' ||
      status === 'cancelled'
    ) {
      return 'admin_hold';
    }

    return 'planning';
  }

  private normalizeProject<T extends { status: string | null; name?: string }>(
    project: T,
  ) {
    const projectWithTasks = project as T & {
      tasks?: Array<{
        id: string;
        title: string;
        assignedTo?: {
          id: string;
          fullName: string;
          email?: string | null;
          phoneNumber?: string | null;
          profileImage?: string | null;
          status?: string | null;
        } | null;
      }>;
      _count?: Record<string, number>;
    };

    const members = new Map<
      string,
      {
        id: string;
        fullName: string;
        email?: string | null;
        phoneNumber?: string | null;
        profileImage?: string | null;
        status?: string | null;
        tasks: Array<{
          id: string;
          title: string;
          projectName: string;
        }>;
      }
    >();

    const assignedMemberTasks: Array<{
      userId: string;
      fullName: string;
      taskId: string;
      taskName: string;
      projectName: string;
    }> = [];

    for (const task of projectWithTasks.tasks || []) {
      if (!task.assignedTo) {
        continue;
      }

      const assignedUser = task.assignedTo;
      const projectName = projectWithTasks.name || '';

      if (!members.has(assignedUser.id)) {
        members.set(assignedUser.id, {
          id: assignedUser.id,
          fullName: assignedUser.fullName,
          email: assignedUser.email,
          phoneNumber: assignedUser.phoneNumber,
          profileImage: assignedUser.profileImage,
          status: assignedUser.status,
          tasks: [],
        });
      }

      members.get(assignedUser.id)?.tasks.push({
        id: task.id,
        title: task.title,
        projectName,
      });

      assignedMemberTasks.push({
        userId: assignedUser.id,
        fullName: assignedUser.fullName,
        taskId: task.id,
        taskName: task.title,
        projectName,
      });
    }

    const { tasks, ...projectWithoutTasks } = projectWithTasks;
    void tasks;

    return {
      ...projectWithoutTasks,
      status: this.normalizeProjectStatus(project.status),
      members: Array.from(members.values()),
      assignedMemberTasks,
      _count: {
        ...(projectWithTasks._count || {}),
        members: members.size,
      },
    };
  }

  private validateDates(startDate: Date | null, dueDate: Date | null) {
    if (startDate && dueDate && dueDate < startDate) {
      throw new BadRequestException(
        'Due date cannot be earlier than start date',
      );
    }
  }

  private async ensureProjectNameIsAvailable(
    name: string,
    ignoreProjectId?: string,
  ) {
    const normalizedName = name.trim().toLowerCase();

    if (!normalizedName) {
      throw new BadRequestException('Project name is required');
    }

    const existingProject = await this.prisma.project.findFirst({
      where: {
        normalizedName,

        ...(ignoreProjectId && {
          NOT: {
            id: ignoreProjectId,
          },
        }),
      },
      select: {
        id: true,
      },
    });

    if (existingProject) {
      throw new ConflictException('Project name already exists');
    }
  }

  async create(adminId: string, createProjectDto: CreateProjectDto) {
    await this.verifyAdmin(adminId);

    const { name, description, startDate, dueDate, priority } =
      createProjectDto;

    await this.ensureProjectNameIsAvailable(name);
    const normalizedName = name.trim().toLowerCase();

    const parsedStartDate = startDate ? new Date(startDate) : null;

    const parsedDueDate = dueDate ? new Date(dueDate) : null;

    this.validateDates(parsedStartDate, parsedDueDate);

    const project = await this.prisma.project.create({
      data: {
        name: name.trim(),
        normalizedName,

        description: description?.trim() || null,

        startDate: parsedStartDate,
        dueDate: parsedDueDate,

        priority: priority || 'medium',
        status: 'planning',

        createdBy: {
          connect: {
            id: adminId,
          },
        },

      },

      include: projectInclude,
    });

    return {
      message: 'Project created successfully',
      project: this.normalizeProject(project),
    };
  }

  async findAll(user: AuthenticatedProjectUser) {
    if (user.role !== 'admin' && user.role !== 'user') {
      throw new ForbiddenException('You are not allowed to view projects');
    }

    const projects = await this.prisma.project.findMany({
      where:
        user.role === 'user'
          ? {
              tasks: {
                some: {
                  assignedToId: user.userId,
                },
              },
            }
          : undefined,

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        ...projectInclude,

        _count: {
          select: {
            tasks: true,
          },
        },
      },
    });

    return {
      message: 'Projects fetched successfully',
      projects: projects.map((project) => this.normalizeProject(project)),
    };
  }

  async findOne(user: AuthenticatedProjectUser, id: string) {
    if (user.role !== 'admin' && user.role !== 'user') {
      throw new ForbiddenException('You are not allowed to view projects');
    }

    const project = await this.prisma.project.findUnique({
      where: {
        id,
      },

      include: projectInclude,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (
      user.role === 'user' &&
      !project.tasks.some((task) => task.assignedTo?.id === user.userId)
    ) {
      throw new ForbiddenException('You are not assigned to this project');
    }

    return {
      message: 'Project fetched successfully',
      project: this.normalizeProject(project),
    };
  }

  async update(
    adminId: string,
    id: string,
    updateProjectDto: UpdateProjectDto,
  ) {
    await this.verifyAdmin(adminId);

    const existingProject = await this.prisma.project.findUnique({
      where: {
        id,
      },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    const { name, description, startDate, dueDate, priority, status } =
      updateProjectDto;

    if (name !== undefined) {
      await this.ensureProjectNameIsAvailable(name, id);
    }

    const normalizedName =
      name !== undefined ? name.trim().toLowerCase() : undefined;

    const updatedStartDate =
      startDate !== undefined ? new Date(startDate) : existingProject.startDate;

    const updatedDueDate =
      dueDate !== undefined ? new Date(dueDate) : existingProject.dueDate;

    this.validateDates(updatedStartDate, updatedDueDate);

    const currentStatus = this.normalizeProjectStatus(existingProject.status);

    const nextStatus =
      status !== undefined ? this.normalizeProjectStatus(status) : undefined;

    if (nextStatus !== undefined && nextStatus !== currentStatus) {
      const adminCanChangeStatus =
        nextStatus === 'admin_hold' ||
        (currentStatus === 'admin_hold' && nextStatus === 'planning');

      if (!adminCanChangeStatus) {
        throw new BadRequestException(
          'Admin can only hold or release a project',
        );
      }
    }

    const project = await this.prisma.project.update({
      where: {
        id,
      },

      data: {
        ...(name !== undefined && {
          name: name.trim(),
        }),

        ...(normalizedName !== undefined && {
          normalizedName,
        }),

        ...(description !== undefined && {
          description: description.trim() || null,
        }),

        ...(startDate !== undefined && {
          startDate: updatedStartDate,
        }),

        ...(dueDate !== undefined && {
          dueDate: updatedDueDate,
        }),

        ...(priority !== undefined && {
          priority,
        }),

        ...(nextStatus !== undefined && {
          status: nextStatus,
        }),

      },

      include: projectInclude,
    });

    return {
      message: 'Project updated successfully',
      project: this.normalizeProject(project),
    };
  }

  async updateMyStatus(
    user: AuthenticatedProjectUser,
    id: string,
    updateMyProjectStatusDto: UpdateMyProjectStatusDto,
  ) {
    if (user.role !== 'user') {
      throw new ForbiddenException('Only assigned users can update work status');
    }

    const project = await this.prisma.project.findUnique({
      where: {
        id,
      },

      include: projectInclude,
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isAssignedUser = project.tasks.some(
      (task) => task.assignedTo?.id === user.userId,
    );

    if (!isAssignedUser) {
      throw new ForbiddenException('You are not assigned to this project');
    }

    const currentStatus = this.normalizeProjectStatus(project.status);

    if (currentStatus === 'admin_hold') {
      throw new ForbiddenException('This project is currently on admin hold');
    }

    if (currentStatus === 'completed') {
      throw new BadRequestException('Completed projects cannot be reopened');
    }

    const updatedProject = await this.prisma.project.update({
      where: {
        id,
      },

      data: {
        status: updateMyProjectStatusDto.status,
      },

      include: projectInclude,
    });

    return {
      message: 'Project status updated successfully',
      project: this.normalizeProject(updatedProject),
    };
  }

  async remove(adminId: string, id: string) {
    await this.verifyAdmin(adminId);

    const project = await this.prisma.project.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.project.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message: 'Project deleted successfully',
    };
  }
}
