import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../../database/database.service';
import { ChatDto, ReportDto } from './dto/ai.dto';

type HistoryMessage = { role: 'user' | 'assistant'; content: string };
type ReadingRow = RowDataPacket & { wendu: number | string; shidu: number | string; time: string };
type InventoryRow = RowDataPacket & { productTypes: number; totalQuantity: number };
type LogRow = RowDataPacket & { roomId: string | null; action: string; success: number; message: string | null; createdAt: string };
const ROOM_IDS = ['101', '102', '108', '109', '113', '115', '116', '117', '118', '119'];

@Injectable()
export class AiService {
  private readonly histories = new Map<string, HistoryMessage[]>();

  constructor(@Inject(ConfigService) private readonly config: ConfigService, @Inject(DatabaseService) private readonly database: DatabaseService) {}

  getSuggestions() {
    return { suggestions: [
      { id: 1, question: '分析当前各房间的温湿度状态', category: 'telemetry' },
      { id: 2, question: '汇总当前库存并提示需要关注的房间', category: 'inventory' },
      { id: 3, question: '分析最近空调操作失败的原因', category: 'operations' },
      { id: 4, question: '根据当前数据给出节能建议', category: 'energy' },
    ] };
  }

  async getDashboard() {
    const context = await this.getWarehouseContext();
    return { success: true, ...context.dashboard, updatedAt: new Date().toISOString() };
  }

  async chat(input: ChatDto) {
    const sessionId = input.sessionId ?? 'default';
    const history = this.histories.get(sessionId) ?? [];
    const context = await this.getWarehouseContext();
    const completion = await this.client().chat.completions.create({
      model: this.config.get<string>('DEEPSEEK_MODEL') ?? 'deepseek-chat',
      messages: [
        { role: 'system', content: `你是智能仓储 AI 助手。回答必须基于以下数据库实时快照；若数据缺失请明确说明，不能编造。给出清晰、可执行的仓储建议。\n\n${JSON.stringify(context.promptData)}` },
        ...history.slice(-10),
        { role: 'user', content: input.message },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    });
    const response = completion.choices[0]?.message.content ?? '未获得模型回复。';
    const updatedHistory: HistoryMessage[] = [...history, { role: 'user', content: input.message }, { role: 'assistant', content: response }];
    this.histories.set(sessionId, updatedHistory.slice(-20));
    return { success: true, response, timestamp: new Date().toISOString(), tokens: completion.usage?.total_tokens ?? 0 };
  }

  async generateReport(input: ReportDto) {
    const context = await this.getWarehouseContext();
    const reportType = input.reportType ?? '运营';
    const dateRange = input.dateRange ?? '当前实时数据';
    const completion = await this.client().chat.completions.create({
      model: this.config.get<string>('DEEPSEEK_MODEL') ?? 'deepseek-chat',
      messages: [{ role: 'system', content: `你是仓储运营分析师。仅依据下列数据库快照生成结构化报告，列出数据依据、风险和建议。\n${JSON.stringify(context.promptData)}` }, { role: 'user', content: `生成${dateRange}的${reportType}报告。` }],
      temperature: 0.3,
      max_tokens: 1500,
    });
    return { success: true, report: completion.choices[0]?.message.content ?? '', generatedAt: new Date().toISOString(), type: `${reportType}报告` };
  }

  clearHistory(sessionId: string) { this.histories.delete(sessionId); return { success: true, message: 'Chat history cleared' }; }

  private async getWarehouseContext() {
    const telemetry = await Promise.all(ROOM_IDS.map(async (roomId) => {
      try {
        const [row] = await this.database.query<ReadingRow[]>(`SELECT wendu, shidu, time FROM \`${roomId}\` ORDER BY time DESC LIMIT 1`);
        return row ? { roomId, temperature: Number(row.wendu), humidity: Number(row.shidu), time: row.time } : { roomId, unavailable: true };
      } catch { return { roomId, unavailable: true }; }
    }));
    const inventory = await Promise.all(ROOM_IDS.map(async (roomId) => {
      try {
        const [row] = await this.database.query<InventoryRow[]>(`SELECT COUNT(*) AS productTypes, COALESCE(SUM(number), 0) AS totalQuantity FROM \`data${roomId}\` WHERE number > 0`);
        return { roomId, productTypes: Number(row?.productTypes ?? 0), totalQuantity: Number(row?.totalQuantity ?? 0) };
      } catch { return { roomId, productTypes: 0, totalQuantity: 0, unavailable: true }; }
    }));
    let recentOperations: Array<{ roomId: string | null; action: string; success: boolean; message: string | null; createdAt: string }> = [];
    try {
      const rows = await this.database.query<LogRow[]>('SELECT room_id AS roomId, action, success, message, created_at AS createdAt FROM operation_logs ORDER BY id DESC LIMIT 10');
      recentOperations = rows.map((row) => ({ ...row, success: Boolean(row.success) }));
    } catch { /* The log migration may not have been run yet. */ }
    const availableTelemetry = telemetry.filter((item): item is { roomId: string; temperature: number; humidity: number; time: string } => 'temperature' in item);
    const averageTemperature = availableTelemetry.length ? Math.round(availableTelemetry.reduce((sum, item) => sum + item.temperature, 0) / availableTelemetry.length * 10) / 10 : null;
    const averageHumidity = availableTelemetry.length ? Math.round(availableTelemetry.reduce((sum, item) => sum + item.humidity, 0) / availableTelemetry.length * 10) / 10 : null;
    const totalQuantity = inventory.reduce((sum, item) => sum + item.totalQuantity, 0);
    return { dashboard: { averageTemperature, averageHumidity, telemetryRooms: availableTelemetry.length, totalQuantity, productTypes: inventory.reduce((sum, item) => sum + item.productTypes, 0), failedOperations: recentOperations.filter((item) => !item.success).length }, promptData: { telemetry, inventory, recentOperations, generatedAt: new Date().toISOString() } };
  }

  private client(): OpenAI {
    const apiKey = this.config.get<string>('DEEPSEEK_API_KEY');
    if (!apiKey || apiKey.startsWith('replace-with-')) throw new ServiceUnavailableException('DEEPSEEK_API_KEY is not configured');
    return new OpenAI({ apiKey, baseURL: this.config.get<string>('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com' });
  }
}
