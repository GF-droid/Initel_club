import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SkuModule } from '../sku/sku.module';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  // InventoryService 在出入库时会解析/建档 SKU 并写流水
  imports: [DatabaseModule, SkuModule],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
