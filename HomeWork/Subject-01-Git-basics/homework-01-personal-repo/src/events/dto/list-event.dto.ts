import { IsEnum, IsOptional, Matches } from 'class-validator';

export enum EventRange {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

export class ListEventDto {
  @IsEnum(EventRange)
  range: EventRange;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;
}
