import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CompareQueryDto, HistoryQueryDto, LimitQueryDto } from './dto/telemetry-query.dto';
import { TelemetryService } from './telemetry.service';

@ApiTags('telemetry')
@Controller('telemetry')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Get('rooms')
  getAllRooms() {
    return this.telemetryService.getLatestForAllRooms();
  }

  @Get('rooms/compare')
  compare(@Query() query: CompareQueryDto) {
    const rooms = (query.rooms ?? '101,102').split(',').map((room) => room.trim());
    return this.telemetryService.compare(rooms, query.limit ?? 10, query.type ?? 'wendu');
  }

  @Get('rooms/:roomId/history')
  getHistory(@Param('roomId') roomId: string, @Query() query: HistoryQueryDto) {
    return this.telemetryService.getHistory(roomId, query.limit ?? 50, query.startTime, query.endTime);
  }

  @Get('rooms/:roomId')
  getRoom(@Param('roomId') roomId: string, @Query() query: LimitQueryDto) {
    return this.telemetryService.getRoomReadings(roomId, query.limit ?? 10);
  }

  @Get('health')
  health() {
    return this.telemetryService.health();
  }
}
