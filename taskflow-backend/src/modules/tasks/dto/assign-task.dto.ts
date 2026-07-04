import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignTaskDto {
  @IsUUID('4')
  userId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  assignmentNote?: string;
}
