import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsOptional()
  @IsIn(['pending', 'in_progress', 'completed', 'on_hold', 'cancelled'])
  status?: string;

  @IsOptional()
  @IsUUID('4')
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  assignmentNote?: string;
}
