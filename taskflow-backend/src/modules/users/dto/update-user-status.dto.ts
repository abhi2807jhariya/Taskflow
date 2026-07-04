import { IsIn } from 'class-validator';

export class UpdateUserStatusDto {
  @IsIn(['active', 'inactive'], {
    message: 'Status must be active or inactive',
  })
  status: 'active' | 'inactive';
}
