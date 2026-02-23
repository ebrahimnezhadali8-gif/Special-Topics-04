import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsOptional()
  description: string;
}
