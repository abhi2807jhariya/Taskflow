import { IsIn } from 'class-validator';

export class UpdateMyTaskStatusDto {
  @IsIn(['pending', 'in_progress', 'completed'])
  status!: 'pending' | 'in_progress' | 'completed';
}
