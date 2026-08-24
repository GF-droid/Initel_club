import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InboundDto, OutboundDto } from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('inbound')
  inbound(@Body() input: InboundDto) {
    return this.inventoryService.inbound(input);
  }

  @Post('outbound')
  outbound(@Body() input: OutboundDto) {
    return this.inventoryService.outbound(input);
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
