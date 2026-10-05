import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'node:path';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { validateEnvironment } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { OperationLogsModule } from './modules/operation-logs/operation-logs.module';
import { SensorModule } from './modules/sensor/sensor.module';
import { SkuModule } from './modules/sku/sku.module';
import { AirConditionerModule } from './modules/air-conditioner/air-conditioner.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Resolve the repository environment file independently of the process
      // working directory (npm, systemd and PM2 may all use different cwd).
      envFilePath: [
        resolve(__dirname, '../../../.env'),
        resolve(process.cwd(), '.env'),
        resolve(process.cwd(), '../.env'),
      ],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    HealthModule,
    TelemetryModule,
    InventoryModule,
    SkuModule,
    AuthModule,
    AiModule,
    OperationLogsModule,
    SensorModule,
    AirConditionerModule,
  ],
})
export class AppModule {}
