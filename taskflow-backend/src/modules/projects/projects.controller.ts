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

import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateMyProjectStatusDto } from './dto/update-my-project-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    fullName: string;
    email: string;
    role: string;
  };
};

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(request.user.userId, createProjectDto);
  }

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.projectsService.findAll(request.user);
  }

  @Get(':id')
  findOne(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.projectsService.findOne(request.user, id);
  }

  @Patch(':id/my-status')
  updateMyStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateMyProjectStatusDto: UpdateMyProjectStatusDto,
  ) {
    return this.projectsService.updateMyStatus(
      request.user,
      id,
      updateMyProjectStatusDto,
    );
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(
      request.user.userId,
      id,
      updateProjectDto,
    );
  }

  @Delete(':id')
  remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.projectsService.remove(request.user.userId, id);
  }
}
