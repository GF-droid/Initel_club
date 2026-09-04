import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SensorGateway } from './sensor.gateway';

@ApiTags('sensors')
@Controller('sensors')
export class SensorController {
  constructor(@Inject(SensorGateway) private readonly gateway: SensorGateway) {}

  @Get('health')
  health() {
    return this.gateway.health();
  }

  @Get('smoke')
  smoke() {
    return { success: true, data: this.gateway.getSmokeStatuses() };
  }

  @Get('smoke/:roomId')
  smokeByRoom(@Param('roomId') roomId: string) {
    const result = this.gateway.getSmokeStatuses(roomId);
    if (!result) throw new NotFoundException('Invalid room ID');
    return { success: true, data: result };
  }
}
