import { IsIn } from 'class-validator';

export class UpdateMyProjectStatusDto {
  @IsIn(['in_progress', 'pending', 'completed'])
  status!: 'in_progress' | 'pending' | 'completed';
}
