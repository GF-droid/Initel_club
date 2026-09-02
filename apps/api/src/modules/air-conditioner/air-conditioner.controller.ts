import { Body, Controller, HttpCode, HttpStatus, Inject, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SensorGateway } from '../sensor/sensor.gateway';
import { AirConditionerCommandDto } from './dto/air-conditioner-command.dto';

@ApiTags('air-conditioners')
@Controller('air-conditioners')
export class AirConditionerController {
  constructor(@Inject(SensorGateway) private readonly sensors: SensorGateway) {}

  @Post(':roomId/commands')
  @HttpCode(HttpStatus.ACCEPTED)
  createCommand(@Param('roomId') roomId: string, @Body() command: AirConditionerCommandDto) {
    return this.sensors.dispatchAirConditionerCommand(roomId, command);
  }
}
