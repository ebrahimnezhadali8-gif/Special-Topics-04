import { IsNotEmpty } from 'class-validator';

export class SearchEventDto {
  @IsNotEmpty()
  q: string;
}
