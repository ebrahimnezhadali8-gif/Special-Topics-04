import { IsNotEmpty, Matches } from 'class-validator';
import { EventReponseDto } from './response-envent.dto';

export class ConflictEventDto {
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}

export class ConflictEventReponseDto {
  events: EventReponseDto[];
}
