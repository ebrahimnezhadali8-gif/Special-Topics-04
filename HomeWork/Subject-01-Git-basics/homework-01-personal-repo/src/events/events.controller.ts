import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { DeleteEventDto } from './dto/delete-event.dto';
import { ListEventDto } from './dto/list-event.dto';
import { SearchEventDto } from './dto/search-event.dto';
import { ConflictEventDto } from './dto/conflict-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  add(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.addEvent(createEventDto);
  }

  @Patch(':id')
  edit(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.UpdateEvent(+id, updateEventDto);
  }

  @Delete()
  remove(@Query() dto: DeleteEventDto) {
    return this.eventsService.removeEvent(dto.start);
  }

  @Get()
  list(@Query() dto: ListEventDto) {
    return this.eventsService.listEvents(dto);
  }

  @Get('search')
  searchList(@Query() dto: SearchEventDto) {
    return this.eventsService.searchEvents(dto);
  }

  @Get('conflicts')
  conflicts(@Query() dto: ConflictEventDto) {
    return this.eventsService.listConflict(dto);
  }
}
