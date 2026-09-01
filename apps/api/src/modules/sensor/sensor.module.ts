import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SensorGateway } from './sensor.gateway';
import { SensorController } from './sensor.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [SensorController],
  providers: [SensorGateway],
  exports: [SensorGateway],
})
export class SensorModule {}
