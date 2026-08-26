import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  controllers: [AiController],
  imports: [DatabaseModule],
  providers: [AiService],
})
export class AiModule {}
