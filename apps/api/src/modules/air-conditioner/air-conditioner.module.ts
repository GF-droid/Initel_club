import { Module } from '@nestjs/common';
import { SensorModule } from '../sensor/sensor.module';
import { AirConditionerController } from './air-conditioner.controller';

@Module({
  imports: [SensorModule],
  controllers: [AirConditionerController],
})
export class AirConditionerModule {}
