import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SkuController } from './sku.controller';
import { SkuService } from './sku.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SkuController],
  providers: [SkuService],
  // InventoryService 需要在出入库时解析/建档 SKU，所以必须导出
  exports: [SkuService],
})
export class SkuModule {}
