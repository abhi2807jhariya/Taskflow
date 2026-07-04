import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';

import { CreateProjectDto } from './create-project.dto';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsIn([
    'planning',
    'in_progress',
    'pending',
    'completed',
    'admin_hold',
    'active',
    'on_hold',
    'cancelled',
  ])
  status?: string;
}
