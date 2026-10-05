import { Body, Controller, Get, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InboundBatchDto, InboundDto, LedgerQueryDto, OutboundDto } from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly inventoryService: InventoryService) {}

  @Post('inbound')
  inbound(@Body() input: InboundDto) {
    return this.inventoryService.inbound(input);
  }

  @Post('inbound/batch')
  inboundBatch(@Body() input: InboundBatchDto) {
    return this.inventoryService.inboundBatch(input.items);
  }

  @Post('outbound')
  outbound(@Body() input: OutboundDto) {
    return this.inventoryService.outbound(input);
  }

  /** 库存流水（台账）：只追加的历史记录，可按房间/物资/类型/时间筛选。 */
  @Get('ledger')
  getLedger(@Query() query: LedgerQueryDto) {
    return this.inventoryService.getLedger(query);
  }

  @Get('rooms/:roomId/items')
  getRoomItems(@Param('roomId') roomId: string) {
    return this.inventoryService.getRoomItems(roomId);
  }

  @Get('items')
  getAllItems() {
    return this.inventoryService.getAllItems();
  }
}
