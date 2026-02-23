import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventRepository {
  constructor(
    @InjectRepository(Event)
    private readonly repo: Repository<Event>,
  ) {}
  async createEvent(dto: CreateEventDto): Promise<Event> {
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(Event)
      .values({
        title: dto.title,
        description: dto.description,
        start: new Date(dto.start),
        end: new Date(dto.end),
      })
      .returning('*')
      .execute();

    return result.raw[0];
  }
  async updateEvent(id: number, dto: UpdateEventDto): Promise<Event> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Event)
      .set({
        ...dto,
      })
      .where('id = :id', { id })
      .andWhere('deletedAt IS NULL')
      .returning('*')
      .execute();

    return result.raw[0];
  }
  async DeleteEvent(start: Date): Promise<void> {
    const result = await this.repo
      .createQueryBuilder()
      .softDelete()
      .from(Event)
      .where('start = :start', { start })
      .andWhere('deletedAt IS NULL')
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException('رویداد با این تاریخ یافت نشد');
    }
  }

  async existsById(id: number): Promise<boolean> {
    return this.repo.exists({ where: { id } });
  }

  async countActiveEvent(): Promise<number> {
    return this.repo
      .createQueryBuilder('event')
      .where('event.deletedAt IS NULL')
      .getCount();
  }
  async findDate(start: Date, end: Date): Promise<Event[]> {
    return this.repo
      .createQueryBuilder('event')
      .where('event.start >= :start', { start })
      .andWhere('event.start<= :end', { end })
      .andWhere('event.deletedAt IS NULL')
      .orderBy('event.start', 'ASC')
      .getMany();
  }
  async searchEvent(q: string): Promise<Event[]> {
    return this.repo
      .createQueryBuilder('event')
      .where('(event.title ILIKE :q OR event.description ILIKE :q)', {
        q: `%${q}%`,
      })
      .andWhere('event.deletedAt IS NULL')
      .orderBy('event.start', 'ASC')
      .getMany();
  }
}
