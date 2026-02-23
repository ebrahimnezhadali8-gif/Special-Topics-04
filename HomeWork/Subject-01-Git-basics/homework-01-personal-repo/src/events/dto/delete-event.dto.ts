import { IsDateString, IsNotEmpty } from 'class-validator';

export class DeleteEventDto {
  @IsNotEmpty()
  @IsDateString()
  start: string;
}
