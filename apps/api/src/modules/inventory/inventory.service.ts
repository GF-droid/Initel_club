import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { DatabaseService } from '../../database/database.service';
import { isRoomId, RoomId } from '../telemetry/telemetry.constants';
import { InboundDto, OutboundDto } from './dto/inventory.dto';

type InventoryRow = RowDataPacket & {
  id: number;
  home: string;
  name: string;
  number: number;
  price: number;
  unity?: string;
  content?: string;
  time?: string;
};

@Injectable()
export class InventoryService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async inbound(input: InboundDto) {
    const roomId = this.requireRoom(input.home);
    const time = this.mysqlDateTime();
    const result = await this.database.query<ResultSetHeader>(
      `INSERT INTO ${this.inventoryTable(roomId)} (home, name, number, price, unity, content, time)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [roomId, input.name, input.number, input.price, input.unity ?? null, input.content ?? null, time],
    );

    return {
      success: true,
      message: 'Inbound completed',
      data: { id: result.insertId, ...input, home: roomId, time },
    };
  }

  async getRoomItems(roomId: string) {
    const room = this.requireRoom(roomId);
    const table = this.inventoryTable(room);

    try {
      const data = await this.database.query<InventoryRow[]>(`SELECT * FROM ${table} ORDER BY id DESC`);
      return { success: true, data };
    } catch (error) {
      if (this.mysqlCode(error) !== 'ER_BAD_FIELD_ERROR') throw error;
      const data = await this.database.query<InventoryRow[]>(`SELECT * FROM ${table}`);
      return { success: true, data };
    }
  }

  async outbound(input: OutboundDto) {
    const roomId = this.requireRoom(input.home);
    const table = this.inventoryTable(roomId);
    const connection = await this.database.getConnection();

    try {
      await connection.beginTransaction();
      const [rows] = await connection.execute<InventoryRow[]>(
        `SELECT id, name, number, unity, price, content
         FROM ${table}
         WHERE name = ? AND number >= ?
         ORDER BY id DESC
         LIMIT 1
         FOR UPDATE`,
        [input.name, input.number],
      );

      if (rows.length === 0) {
        const [existing] = await connection.execute<InventoryRow[]>(
          `SELECT id, name, number FROM ${table} WHERE name = ? ORDER BY id DESC LIMIT 1`,
          [input.name],
        );
        const message = existing.length
          ? `Insufficient stock for ${input.name}; current quantity: ${existing[0].number}`
          : `Item does not exist: ${input.name}`;
        throw new BadRequestException(message);
      }

      const item = rows[0];
      const remaining = Number(item.number) - input.number;
      const [update] = await connection.execute<ResultSetHeader>(
        `UPDATE ${table} SET number = ? WHERE id = ?`,
        [remaining, item.id],
      );
      if (update.affectedRows !== 1) {
        throw new Error('Inventory update did not affect exactly one row');
      }

      await connection.commit();
      return {
        success: true,
        message: 'Outbound completed',
        data: {
          home: roomId,
          name: input.name,
          outbound_number: input.number,
          remaining_number: remaining,
          unity: input.unity ?? item.unity,
          content: input.content ?? 'Outbound operation',
          time: this.mysqlDateTime(),
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getAllItems() {
    const rooms: RoomId[] = ['101', '102', '108', '109', '113', '115', '116', '117', '118', '119'];
    const records = await Promise.all(
      rooms.map(async (roomId) => {
        const table = this.inventoryTable(roomId);
        try {
          const columns = await this.database.query<(RowDataPacket & { Field: string })[]>(`DESCRIBE ${table}`);
          const fields = columns.map((column) => column.Field);
          const orderBy = fields.includes('time') ? 'time' : fields.includes('created_at') ? 'created_at' : 'id';
          const rows = await this.database.query<InventoryRow[]>(
            `SELECT home, name, number AS quantity, price AS unitPrice, unity AS unit,
                    content AS notes, time AS updateTime
             FROM ${table}
             WHERE number > 0
             ORDER BY ${orderBy} DESC`,
          );
          return rows.map((row) => ({ ...row, roomName: `Room ${row.home}` }));
        } catch {
          return [];
        }
      }),
    );

    return records.flat();
  }

  private requireRoom(roomId: string): RoomId {
    if (!isRoomId(roomId)) throw new BadRequestException('Invalid room ID');
    return roomId;
  }

  private inventoryTable(roomId: RoomId): string {
    return `\`data${roomId}\``;
  }

  private mysqlDateTime(): string {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  private mysqlCode(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  }
}
