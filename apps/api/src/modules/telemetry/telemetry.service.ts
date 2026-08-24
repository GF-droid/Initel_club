import { BadRequestException, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2';
import { DatabaseService } from '../../database/database.service';
import { ROOM_IDS, RoomId, isRoomId } from './telemetry.constants';

type ReadingRow = RowDataPacket & { wendu: number | string; shidu: number | string; time: string };

@Injectable()
export class TelemetryService {
  constructor(private readonly database: DatabaseService) {}

  async getLatestForAllRooms() {
    const records = await Promise.all(
      ROOM_IDS.map(async (roomId) => {
        try {
          const [row] = await this.findReadings(roomId, 1);
          return {
            wendu: row ? this.round(row.wendu) : 0,
            shidu: row ? this.round(row.shidu) : 0,
            time: row ? row.time : new Date().toISOString(),
          };
        } catch {
          return { wendu: 0, shidu: 0, time: new Date().toISOString() };
        }
      }),
    );

    return records;
  }

  async getRoomReadings(roomId: string, limit = 10) {
    const room = this.requireRoom(roomId);
    const rows = await this.findReadings(room, limit);

    return rows
      .map((row) => ({
        wendu: this.round(row.wendu),
        shidu: this.round(row.shidu),
        time: this.formatTime(row.time),
      }))
      .reverse();
  }

  async getHistory(roomId: string, limit = 50, startTime?: string, endTime?: string) {
    const room = this.requireRoom(roomId);
    if ((startTime && !endTime) || (!startTime && endTime)) {
      throw new BadRequestException('startTime and endTime must be provided together');
    }

    const rows = await this.findReadings(room, limit, startTime, endTime);
    return {
      success: true,
      data: rows
        .map((row) => ({
          wendu: this.round(row.wendu),
          shidu: this.round(row.shidu),
          time: this.formatDateTime(row.time),
          timestamp: row.time,
        }))
        .reverse(),
      roomId: room,
      total: rows.length,
      timeRange: { start: startTime, end: endTime },
    };
  }

  async compare(roomIds: string[], limit = 10, dataType: 'wendu' | 'shidu' = 'wendu') {
    const entries = await Promise.all(
      roomIds.map(async (roomId) => {
        if (!isRoomId(roomId)) {
          return [roomId, { error: 'Invalid room ID' }] as const;
        }

        try {
          const rows = await this.findReadings(roomId, limit);
          return [
            roomId,
            {
              data: rows
                .map((row) => ({ value: this.round(row[dataType]), time: this.formatTime(row.time) }))
                .reverse(),
              roomName: `Room ${roomId}`,
            },
          ] as const;
        } catch (error) {
          return [roomId, { error: error instanceof Error ? error.message : 'Query failed' }] as const;
        }
      }),
    );

    return { success: true, dataType, results: Object.fromEntries(entries) };
  }

  async health() {
    await this.database.query('SELECT 1');
    return {
      success: true,
      database: 'connected',
      timestamp: new Date().toISOString(),
      totalRooms: ROOM_IDS.length,
      rooms: ROOM_IDS,
    };
  }

  private async findReadings(roomId: RoomId, limit: number, startTime?: string, endTime?: string) {
    const parameters: unknown[] = [];
    let sql = `SELECT wendu, shidu, time FROM ${this.telemetryTable(roomId)}`;

    if (startTime && endTime) {
      sql += ' WHERE time BETWEEN ? AND ?';
      parameters.push(startTime, endTime);
    }

    sql += ' ORDER BY time DESC LIMIT ?';
    parameters.push(limit);
    return this.database.query<ReadingRow[]>(sql, parameters);
  }

  private requireRoom(roomId: string): RoomId {
    if (!isRoomId(roomId)) {
      throw new BadRequestException('Invalid room ID');
    }
    return roomId;
  }

  private telemetryTable(roomId: RoomId): string {
    return `\`${roomId}\``;
  }

  private round(value: number | string): number {
    return Math.round(Number(value) * 10) / 10;
  }

  private formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const pad = (number: number) => number.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
