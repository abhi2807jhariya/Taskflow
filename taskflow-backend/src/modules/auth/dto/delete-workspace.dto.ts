import { Equals, IsNotEmpty, IsString } from 'class-validator';

export class DeleteWorkspaceDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @Equals('DELETE TASKFLOW', {
    message: 'Confirmation text must be DELETE TASKFLOW',
  })
  confirmationText!: string;
}
