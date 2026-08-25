import { Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { DatabaseService } from '../../database/database.service';
import { CreateOperationLogDto } from './dto/operation-log.dto';

type OperationLogRow = RowDataPacket & {
  id: number;
  operation_type: string;
  room_id: string | null;
  action: string;
  details: string | null;
  success: number;
  message: string | null;
  operator: string | null;
  created_at: string;
};

@Injectable()
export class OperationLogsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(input: CreateOperationLogDto) {
    const result = await this.database.query<ResultSetHeader>(
      `INSERT INTO operation_logs
       (operation_type, room_id, action, details, success, message, operator)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [input.operationType, input.roomId ?? null, input.action, input.details ? JSON.stringify(input.details) : null,
        input.success ? 1 : 0, input.message ?? null, input.operator ?? null],
    );
    return { success: true, data: { id: result.insertId } };
  }

  async findAll(limit = 100) {
    const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
    const rows = await this.database.query<OperationLogRow[]>(
      `SELECT id, operation_type AS operationType, room_id AS roomId, action, details,
              success, message, operator, created_at AS createdAt
       FROM operation_logs ORDER BY id DESC LIMIT ${safeLimit}`,
    );
    return rows.map((row) => ({
      ...row,
      success: Boolean(row.success),
      details: this.parseDetails(row.details),
    }));
  }

  private parseDetails(value: string | null) {
    if (!value) return null;
    try { return JSON.parse(value); } catch { return value; }
  }
}
