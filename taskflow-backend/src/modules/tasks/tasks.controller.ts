import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignTaskDto } from './dto/assign-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateMyTaskStatusDto } from './dto/update-my-task-status.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    fullName: string;
    email: string;
    role: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createTaskDto: CreateTaskDto,
  ) {
    return this.tasksService.create(request.user.userId, createTaskDto);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.tasksService.findAll(request.user);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.tasksService.findOne(request.user, id);
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.update(request.user.userId, id, updateTaskDto);
  }

  @Patch(':id/assign')
  assign(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() assignTaskDto: AssignTaskDto,
  ) {
    return this.tasksService.assign(request.user.userId, id, assignTaskDto);
  }

  @Patch(':id/my-status')
  updateMyStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateMyTaskStatusDto: UpdateMyTaskStatusDto,
  ) {
    return this.tasksService.updateMyStatus(
      request.user,
      id,
      updateMyTaskStatusDto,
    );
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.tasksService.remove(request.user.userId, id);
  }
}
