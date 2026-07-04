import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateMyTaskStatusDto } from './dto/update-my-task-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

type AuthenticatedTaskUser = {
  userId: string;
  role: string;
};

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

type TaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

const taskInclude = {
  project: {
    select: {
      id: true,
      name: true,
      priority: true,
      status: true,
    },
  },
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
  createdBy: {
    select: {
      id: true,
      fullName: true,
      email: true,
      profileImage: true,
    },
  },
};

@Injectable()
export class TasksService {
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
      throw new ForbiddenException('Only an active admin can manage tasks');
    }
  }

  private normalizePriority(priority?: string | null): TaskPriority {
    if (
      priority === 'low' ||
      priority === 'medium' ||
      priority === 'high' ||
      priority === 'urgent'
    ) {
      return priority;
    }

    return 'medium';
  }

  private normalizeStatus(status?: string | null): TaskStatus {
    if (status === 'in_progress' || status === 'in-progress') {
      return 'in_progress';
    }

    if (status === 'completed') {
      return 'completed';
    }

    if (status === 'on_hold' || status === 'on-hold') {
      return 'on_hold';
    }

    if (status === 'cancelled') {
      return 'cancelled';
    }

    return 'pending';
  }

  private normalizeTask<T extends Record<string, unknown>>(task: T) {
    const taskWithRelations = task as T & {
      status?: string | null;
      priority?: string | null;
      project?: {
        id: string;
        name: string;
        priority?: string | null;
      } | null;
      assignedTo?: {
        id: string;
        fullName: string;
      } | null;
      assignedToId?: string | null;
    };

    return {
      ...task,
      status: this.normalizeStatus(taskWithRelations.status),
      priority: this.normalizePriority(taskWithRelations.priority),
      projectId: taskWithRelations.project?.id ?? taskWithRelations.projectId,
      projectName: taskWithRelations.project?.name ?? '',
      assignedUserId:
        taskWithRelations.assignedTo?.id ??
        taskWithRelations.assignedToId ??
        null,
      assignedUserName: taskWithRelations.assignedTo?.fullName ?? null,
    };
  }

  private validateDates(startDate: Date | null, dueDate: Date | null) {
    if (startDate && dueDate && dueDate < startDate) {
      throw new BadRequestException(
        'Due date cannot be earlier than start date',
      );
    }
  }

  private async findActiveUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        role: 'user',
        status: 'active',
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Selected user is invalid or inactive');
    }

    return user;
  }

  private async findProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        priority: true,
        startDate: true,
        dueDate: true,
      },
    });

    if (!project) {
      throw new BadRequestException('Selected project was not found');
    }

    return project;
  }

  private validateTaskDatesWithinProject(
    startDate: Date | null,
    dueDate: Date | null,
    project: {
      startDate: Date | null;
      dueDate: Date | null;
    },
  ) {
    if (project.startDate) {
      const projectStart = new Date(project.startDate);
      projectStart.setHours(0, 0, 0, 0);

      if (startDate) {
        const taskStart = new Date(startDate);
        taskStart.setHours(0, 0, 0, 0);

        if (taskStart < projectStart) {
          throw new BadRequestException(
            'Task start date cannot be earlier than project start date',
          );
        }
      }

      if (dueDate) {
        const taskDue = new Date(dueDate);
        taskDue.setHours(0, 0, 0, 0);

        if (taskDue < projectStart) {
          throw new BadRequestException(
            'Task due date cannot be earlier than project start date',
          );
        }
      }
    }

    if (project.dueDate) {
      const projectDue = new Date(project.dueDate);
      projectDue.setHours(0, 0, 0, 0);

      if (startDate) {
        const taskStart = new Date(startDate);
        taskStart.setHours(0, 0, 0, 0);

        if (taskStart > projectDue) {
          throw new BadRequestException(
            'Task start date cannot be later than project due date',
          );
        }
      }

      if (dueDate) {
        const taskDue = new Date(dueDate);
        taskDue.setHours(0, 0, 0, 0);

        if (taskDue > projectDue) {
          throw new BadRequestException(
            'Task due date cannot be later than project due date',
          );
        }
      }
    }
  }

  async create(adminId: string, createTaskDto: CreateTaskDto) {
    await this.verifyAdmin(adminId);

    const project = await this.findProject(createTaskDto.projectId);

    if (createTaskDto.assignedUserId) {
      await this.findActiveUser(createTaskDto.assignedUserId);
    }

    const parsedStartDate = createTaskDto.startDate
      ? new Date(createTaskDto.startDate)
      : null;

    const parsedDueDate = createTaskDto.dueDate
      ? new Date(createTaskDto.dueDate)
      : null;

    this.validateDates(parsedStartDate, parsedDueDate);
    this.validateTaskDatesWithinProject(parsedStartDate, parsedDueDate, project);

    const task = await this.prisma.task.create({
      data: {
        title: createTaskDto.title.trim(),
        description: createTaskDto.description?.trim() || null,
        projectId: project.id,
        createdById: adminId,
        assignedToId: createTaskDto.assignedUserId || null,
        assignedAt: createTaskDto.assignedUserId ? new Date() : null,
        startDate: parsedStartDate,
        dueDate: parsedDueDate,
        priority: this.normalizePriority(createTaskDto.priority ?? project.priority),
        status: 'pending',
      },
      include: taskInclude,
    });

    return {
      message: 'Task created successfully',
      task: this.normalizeTask(task),
    };
  }

  async findAll(user: AuthenticatedTaskUser) {
    if (user.role !== 'admin' && user.role !== 'user') {
      throw new ForbiddenException('You are not allowed to view tasks');
    }

    const tasks = await this.prisma.task.findMany({
      where:
        user.role === 'user'
          ? {
              assignedToId: user.userId,
            }
          : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      include: taskInclude,
    });

    return {
      message: 'Tasks fetched successfully',
      tasks: tasks.map((task) => this.normalizeTask(task)),
    };
  }

  async findOne(user: AuthenticatedTaskUser, id: string) {
    if (user.role !== 'admin' && user.role !== 'user') {
      throw new ForbiddenException('You are not allowed to view tasks');
    }

    const task = await this.prisma.task.findUnique({
      where: {
        id,
      },
      include: taskInclude,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (user.role === 'user' && task.assignedToId !== user.userId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    return {
      message: 'Task fetched successfully',
      task: this.normalizeTask(task),
    };
  }

  async update(adminId: string, id: string, updateTaskDto: UpdateTaskDto) {
    await this.verifyAdmin(adminId);

    const existingTask = await this.prisma.task.findUnique({
      where: {
        id,
      },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    const project = await this.findProject(
      updateTaskDto.projectId || existingTask.projectId,
    );

    if (updateTaskDto.assignedUserId) {
      await this.findActiveUser(updateTaskDto.assignedUserId);
    }

    const updatedStartDate =
      updateTaskDto.startDate !== undefined
        ? new Date(updateTaskDto.startDate)
        : existingTask.startDate;

    const updatedDueDate =
      updateTaskDto.dueDate !== undefined
        ? new Date(updateTaskDto.dueDate)
        : existingTask.dueDate;

    this.validateDates(updatedStartDate, updatedDueDate);
    this.validateTaskDatesWithinProject(updatedStartDate, updatedDueDate, project);

    const assignedUserChanged =
      updateTaskDto.assignedUserId !== undefined &&
      updateTaskDto.assignedUserId !== existingTask.assignedToId;

    const task = await this.prisma.task.update({
      where: {
        id,
      },
      data: {
        ...(updateTaskDto.title !== undefined && {
          title: updateTaskDto.title.trim(),
        }),
        ...(updateTaskDto.description !== undefined && {
          description: updateTaskDto.description.trim() || null,
        }),
        ...(updateTaskDto.projectId !== undefined && {
          projectId: updateTaskDto.projectId,
        }),
        ...(updateTaskDto.assignedUserId !== undefined && {
          assignedToId: updateTaskDto.assignedUserId || null,
          assignedAt: updateTaskDto.assignedUserId
            ? assignedUserChanged
              ? new Date()
              : existingTask.assignedAt
            : null,
        }),
        ...(updateTaskDto.startDate !== undefined && {
          startDate: updatedStartDate,
        }),
        ...(updateTaskDto.dueDate !== undefined && {
          dueDate: updatedDueDate,
        }),
        ...(updateTaskDto.priority !== undefined && {
          priority: this.normalizePriority(updateTaskDto.priority),
        }),
        ...(updateTaskDto.status !== undefined && {
          status: this.normalizeStatus(updateTaskDto.status),
        }),
        ...(updateTaskDto.assignmentNote !== undefined && {
          assignmentNote: updateTaskDto.assignmentNote.trim() || null,
        }),
      },
      include: taskInclude,
    });

    return {
      message: 'Task updated successfully',
      task: this.normalizeTask(task),
    };
  }

  async assign(adminId: string, id: string, assignTaskDto: AssignTaskDto) {
    await this.verifyAdmin(adminId);
    await this.findActiveUser(assignTaskDto.userId);

    const existingTask = await this.prisma.task.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        assignedToId: true,
      },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    if (existingTask.assignedToId) {
      throw new BadRequestException('This task is already assigned');
    }

    const task = await this.prisma.task.update({
      where: {
        id,
      },
      data: {
        assignedToId: assignTaskDto.userId,
        assignedAt: new Date(),
        assignmentNote: assignTaskDto.assignmentNote?.trim() || null,
      },
      include: taskInclude,
    });

    return {
      message: 'Task assigned successfully',
      task: this.normalizeTask(task),
    };
  }

  async updateMyStatus(
    user: AuthenticatedTaskUser,
    id: string,
    updateMyTaskStatusDto: UpdateMyTaskStatusDto,
  ) {
    if (user.role !== 'user') {
      throw new ForbiddenException('Only assigned users can update task status');
    }

    const existingTask = await this.prisma.task.findUnique({
      where: {
        id,
      },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    if (existingTask.assignedToId !== user.userId) {
      throw new ForbiddenException('You are not assigned to this task');
    }

    const currentStatus = this.normalizeStatus(existingTask.status);

    if (currentStatus === 'on_hold' || currentStatus === 'cancelled') {
      throw new ForbiddenException('This task cannot be updated by user');
    }

    if (currentStatus === 'completed') {
      throw new BadRequestException('Completed tasks cannot be reopened');
    }

    const task = await this.prisma.task.update({
      where: {
        id,
      },
      data: {
        status: this.normalizeStatus(updateMyTaskStatusDto.status),
      },
      include: taskInclude,
    });

    return {
      message: 'Task status updated successfully',
      task: this.normalizeTask(task),
    };
  }

  async remove(adminId: string, id: string) {
    await this.verifyAdmin(adminId);

    const existingTask = await this.prisma.task.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existingTask) {
      throw new NotFoundException('Task not found');
    }

    await this.prisma.task.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message: 'Task deleted successfully',
    };
  }
}
