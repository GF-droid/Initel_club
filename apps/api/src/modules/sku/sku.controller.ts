import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateSkuDto, SkuQueryDto, UpdateSkuDto } from './dto/sku.dto';
import { SkuService } from './sku.service';

@ApiTags('sku')
@Controller('sku')
export class SkuController {
  constructor(@Inject(SkuService) private readonly skuService: SkuService) {}

  @Get()
  list(@Query() query: SkuQueryDto) {
    return this.skuService.list(query);
  }

  @Get('stock-summary')
  stockSummary() {
    return this.skuService.stockSummary();
  }

  @Get(':skuCode')
  detail(@Param('skuCode') skuCode: string) {
    return this.skuService.findByCodeOrFail(skuCode);
  }

  @Post()
  create(@Body() input: CreateSkuDto) {
    return this.skuService.create(input);
  }

  /** 一次性把现有库存表里出现过的物资录入主数据（幂等，可重复执行）。 */
  @Post('sync')
  sync() {
    return this.skuService.syncFromInventory();
  }

  @Patch(':skuCode')
  update(@Param('skuCode') skuCode: string, @Body() input: UpdateSkuDto) {
    return this.skuService.update(skuCode, input);
  }

  /** 停用，不做物理删除 —— 历史流水还要指回这条主数据。 */
  @Delete(':skuCode')
  deactivate(@Param('skuCode') skuCode: string) {
    return this.skuService.deactivate(skuCode);
  }
}
