import { Controller, Get, Inject } from '@nestjs/common';
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
}
