import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateOperationLogDto } from './dto/operation-log.dto';
import { OperationLogsService } from './operation-logs.service';

@ApiTags('operation-logs')
@Controller('operation-logs')
export class OperationLogsController {
  constructor(@Inject(OperationLogsService) private readonly service: OperationLogsService) {}

  @Get()
  findAll(@Query('limit') limit?: string) { return this.service.findAll(Number(limit)); }

  @Post()
  create(@Body() input: CreateOperationLogDto) { return this.service.create(input); }
}
