import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SensorGateway } from './sensor.gateway';
import { SensorController } from './sensor.controller';
import { OperationLogsModule } from '../operation-logs/operation-logs.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { MqttService } from './mqtt.service';

@Module({
  imports: [DatabaseModule, OperationLogsModule, TelemetryModule],
  controllers: [SensorController],
  providers: [SensorGateway, MqttService],
  exports: [SensorGateway, MqttService],
})
export class SensorModule {}
