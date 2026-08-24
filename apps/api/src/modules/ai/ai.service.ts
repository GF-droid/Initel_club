import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatDto, ReportDto } from './dto/ai.dto';

type HistoryMessage = { role: 'user' | 'assistant'; content: string };

const SYSTEM_PROMPT = `你是智能仓储 AI 助手，为仓库管理系统提供专业、清晰、可执行的建议。
你擅长仓储数据分析、设备状态监控、库存优化、出入库流程、节能方案、应急处理和运营报告。`;

@Injectable()
export class AiService {
  private readonly histories = new Map<string, HistoryMessage[]>();

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  getSuggestions() {
    return {
      suggestions: [
        { id: 1, question: '分析今日库存周转情况', category: 'analysis' },
        { id: 2, question: '给出仓库布局优化建议', category: 'optimization' },
        { id: 3, question: '检查设备维护状态', category: 'maintenance' },
        { id: 4, question: '推荐节能降耗方案', category: 'energy' },
        { id: 5, question: '生成月度运营报告', category: 'report' },
        { id: 6, question: '提供应急处理流程建议', category: 'emergency' },
      ],
    };
  }

  async chat(input: ChatDto) {
    const sessionId = input.sessionId ?? 'default';
    const history = this.histories.get(sessionId) ?? [];
    const completion = await this.client().chat.completions.create({
      model: this.config.get<string>('MOONSHOT_MODEL') ?? 'moonshot-v1-8k',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.slice(-10),
        { role: 'user', content: input.message },
      ],
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.9,
    });
    const response = completion.choices[0]?.message.content ?? '';
    const updatedHistory: HistoryMessage[] = [
      ...history,
      { role: 'user', content: input.message },
      { role: 'assistant', content: response },
    ];
    this.histories.set(sessionId, updatedHistory.slice(-20));

    return {
      success: true,
      response,
      timestamp: new Date().toISOString(),
      tokens: completion.usage?.total_tokens ?? 0,
    };
  }

  async generateReport(input: ReportDto) {
    const reportType = input.reportType ?? '运营';
    const dateRange = input.dateRange ?? '最近 30 天';
    const completion = await this.client().chat.completions.create({
      model: this.config.get<string>('MOONSHOT_MODEL') ?? 'moonshot-v1-8k',
      messages: [
        { role: 'system', content: '你是专业的仓储管理分析师，擅长生成结构清晰的数据分析报告。' },
        {
          role: 'user',
          content: `请根据${dateRange}的仓储数据生成一份${reportType}报告，包含数据概览、问题分析、优化建议和下一步计划。`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    return {
      success: true,
      report: completion.choices[0]?.message.content ?? '',
      generatedAt: new Date().toISOString(),
      type: `${reportType}报告`,
    };
  }

  clearHistory(sessionId: string) {
    this.histories.delete(sessionId);
    return { success: true, message: 'Chat history cleared' };
  }

  private client(): OpenAI {
    const apiKey = this.config.get<string>('MOONSHOT_API_KEY');
    if (!apiKey || apiKey.startsWith('replace-with-')) {
      throw new ServiceUnavailableException('MOONSHOT_API_KEY is not configured');
    }

    return new OpenAI({
      apiKey,
      baseURL: this.config.get<string>('MOONSHOT_BASE_URL') ?? 'https://api.moonshot.cn/v1',
    });
  }
}
