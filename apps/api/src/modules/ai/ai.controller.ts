import { Body, Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { ChatDto, ReportDto } from './dto/ai.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(@Inject(AiService) private readonly aiService: AiService) {}

  @Get('quick-suggestions')
  suggestions() {
    return this.aiService.getSuggestions();
  }

  @Get('dashboard')
  dashboard() {
    return this.aiService.getDashboard();
  }

  @Post('chat')
  chat(@Body() input: ChatDto) {
    return this.aiService.chat(input);
  }

  @Post('generate-report')
  generateReport(@Body() input: ReportDto) {
    return this.aiService.generateReport(input);
  }

  @Delete('chat/history/:sessionId')
  clearHistory(@Param('sessionId') sessionId: string) {
    return this.aiService.clearHistory(sessionId);
  }
}
