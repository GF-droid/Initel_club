import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';
import { DatabaseService } from '../../database/database.service';
import { ROOM_IDS, isRoomId, RoomId } from '../telemetry/telemetry.constants';
import { SkuService, SkuView } from '../sku/sku.service';
import { InboundDto, LedgerQueryDto, OutboundDto } from './dto/inventory.dto';

type InventoryRow = RowDataPacket & {
  id: number;
  home: string;
  name: string;
  number: number;
  price: number;
  unity?: string;
  content?: string;
  time?: string;
  skuCode?: string | null;
};

type LedgerEntry = {
  roomId: RoomId;
  skuCode: string | null;
  skuName: string;
  operation: 'inbound' | 'outbound' | 'adjust';
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitPrice: number | null;
  amount: number | null;
  orderNo: string | null;
  operator: string | null;
  remark: string | null;
};

/**
 * 出入库与库存查询。
 *
 * 两个要点：
 *
 * 1) 每一次库存变动都会在同事务内追加一条 `inventory_ledger` 流水，包含变动前后
 *    的余量。`quantityBefore/After` 指的是【该房间内该物资的总量】，因为同一物资
 *    在同一个房间可能存在多行（入库是新增行，不是累加到已有行）。
 *
 * 2) 库存行上的 `sku_code` 关联是"尽力而为"的：该列由 006 号迁移添加，若未执行，
 *    写它会报 ER_BAD_FIELD_ERROR，这里静默跳过 —— 流水表不受影响，出入库也不会
 *    因此失败。
 */
@Injectable()
export class InventoryService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(SkuService) private readonly sku: SkuService,
  ) {}

  async inbound(input: InboundDto) {
    const roomId = this.requireRoom(input.home);
    const table = this.inventoryTable(roomId);
    const time = this.mysqlDateTime();
    const orderNo = this.newOrderNo('IN');
    const connection = await this.database.getConnection();

    try {
      await connection.beginTransaction();

      const before = await this.sumQuantity(connection, table, input.name);
      const after = before + Number(input.number);

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO ${table} (home, name, number, price, unity, content, time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [roomId, input.name, input.number, input.price, input.unity ?? null, input.content ?? null, time],
      );

      // SKU 建档走连接池（不在本事务内）：即使事务回滚，多出一条没有库存的
      // 主数据也无害；反之若把它放进事务，反而会拉长持锁时间。
      const sku = await this.resolveSku(input.skuCode, input.name, input.unity, input.price);
      await this.linkSkuCode(connection, table, sku, { id: result.insertId });

      await this.writeLedger(connection, [{
        roomId,
        skuCode: sku?.skuCode ?? null,
        skuName: sku?.name ?? input.name,
        operation: 'inbound',
        quantity: Number(input.number),
        quantityBefore: before,
        quantityAfter: after,
        unitPrice: this.num(input.price),
        amount: this.round2(Number(input.number) * Number(input.price)),
        orderNo,
        operator: 'admin',
        remark: input.content ?? null,
      }]);

      await connection.commit();

      return {
        success: true,
        message: 'Inbound completed',
        data: { id: result.insertId, ...input, home: roomId, time, skuCode: sku?.skuCode ?? null, quantityAfter: after, orderNo },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Bulk inbound used by the Excel import. Rows are grouped by room because each
   * room has its own inventory table, then written inside a single transaction so
   * a malformed row cannot leave a half-imported file behind.
   */
  async inboundBatch(items: InboundDto[]) {
    const grouped = new Map<RoomId, InboundDto[]>();
    for (const input of items) {
      const roomId = this.requireRoom(input.home);
      const list = grouped.get(roomId);
      if (list) list.push(input);
      else grouped.set(roomId, [input]);
    }

    const time = this.mysqlDateTime();
    const orderNo = this.newOrderNo('IN');
    const connection = await this.database.getConnection();

    try {
      await connection.beginTransaction();
      let inserted = 0;
      const ledger: LedgerEntry[] = [];
      const linked = new Set<string>();

      for (const [roomId, list] of grouped) {
        const table = this.inventoryTable(roomId);

        // 一次取出该房间涉及的物资名及其当前总量，避免逐行查询
        const names = [...new Set(list.map((item) => item.name))];
        const totals = new Map<string, number>();
        if (names.length) {
          const namePlaceholders = names.map(() => '?').join(', ');
          const [rows] = await connection.query<(RowDataPacket & { name: string; total: string | number | null })[]>(
            `SELECT name, COALESCE(SUM(number), 0) AS total FROM ${table} WHERE name IN (${namePlaceholders}) GROUP BY name`,
            names,
          );
          for (const row of rows) totals.set(row.name, Number(row.total ?? 0));
        }

        const placeholders = list.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
        const parameters = list.flatMap((input) => [
          roomId,
          input.name,
          input.number,
          input.price,
          input.unity ?? null,
          input.content ?? null,
          time,
        ]);
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO ${table} (home, name, number, price, unity, content, time)
           VALUES ${placeholders}`,
          parameters,
        );
        inserted += result.affectedRows;

        for (const input of list) {
          // 同一批次里同一物资连续入库时，余量要累进而不是都用同一个"变动前"
          const before = totals.get(input.name) ?? 0;
          const after = before + Number(input.number);
          totals.set(input.name, after);

          const sku = await this.resolveSku(input.skuCode, input.name, input.unity, input.price);

          const linkKey = `${roomId}\u0000${input.name}`;
          if (sku?.skuCode && !linked.has(linkKey)) {
            linked.add(linkKey);
            await this.linkSkuCode(connection, table, sku, {});
          }

          ledger.push({
            roomId,
            skuCode: sku?.skuCode ?? null,
            skuName: sku?.name ?? input.name,
            operation: 'inbound',
            quantity: Number(input.number),
            quantityBefore: before,
            quantityAfter: after,
            unitPrice: this.num(input.price),
            amount: this.round2(Number(input.number) * Number(input.price)),
            orderNo,
            operator: 'admin',
            remark: input.content ?? null,
          });
        }
      }

      await this.writeLedger(connection, ledger);
      await connection.commit();

      return {
        success: true,
        message: 'Batch inbound completed',
        data: { inserted, ledgerRows: ledger.length, total: items.length, rooms: [...grouped.keys()], orderNo },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async outbound(input: OutboundDto) {
    const roomId = this.requireRoom(input.home);
    const table = this.inventoryTable(roomId);
    const orderNo = this.newOrderNo('OUT');
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
      const before = await this.sumQuantity(connection, table, input.name);
      const remaining = Number(item.number) - Number(input.number);
      const [update] = await connection.execute<ResultSetHeader>(
        `UPDATE ${table} SET number = ? WHERE id = ?`,
        [remaining, item.id],
      );
      if (update.affectedRows !== 1) {
        throw new Error('Inventory update did not affect exactly one row');
      }

      const sku = await this.resolveSku(input.skuCode, input.name, item.unity ?? null, this.num(item.price));
      await this.linkSkuCode(connection, table, sku, { id: item.id });

      await this.writeLedger(connection, [{
        roomId,
        skuCode: sku?.skuCode ?? null,
        skuName: sku?.name ?? input.name,
        operation: 'outbound',
        quantity: Number(input.number),
        quantityBefore: before,
        quantityAfter: before - Number(input.number),
        unitPrice: this.num(item.price),
        amount: this.round2(Number(input.number) * Number(item.price ?? 0)),
        orderNo,
        operator: 'admin',
        remark: input.content ?? 'Outbound operation',
      }]);

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
          skuCode: sku?.skuCode ?? null,
          quantityAfter: before - Number(input.number),
          orderNo,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /** 库存流水查询。只读、只追加，用于对账与追溯。 */
  async getLedger(query: LedgerQueryDto) {
    try {
      return await this.getLedgerInner(query);
    } catch (error) {
      if (this.mysqlCode(error) === 'ER_NO_SUCH_TABLE') {
        throw new ServiceUnavailableException('库存流水表不存在，请先执行迁移 005_create_inventory_ledger.sql');
      }
      throw error;
    }
  }

  private async getLedgerInner(query: LedgerQueryDto) {
    const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 500);
    const offset = Math.max(Number(query.offset ?? 0) || 0, 0);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.roomId) {
      conditions.push('room_id = ?');
      params.push(query.roomId);
    }
    if (query.skuCode) {
      conditions.push('sku_code = ?');
      params.push(query.skuCode);
    }
    if (query.operation) {
      conditions.push('operation = ?');
      params.push(query.operation);
    }
    if (query.keyword?.trim()) {
      conditions.push('sku_name LIKE ?');
      params.push(`%${query.keyword.trim()}%`);
    }

    const start = this.normalizeTime(query.startTime);
    const end = this.normalizeTime(query.endTime);
    if ((start && !end) || (!start && end)) {
      throw new BadRequestException('startTime 与 endTime 必须同时提供');
    }
    if (start && end) {
      conditions.push('created_at BETWEEN ? AND ?');
      params.push(start, end);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    // limit/offset 已收敛为整数，直接内联以免依赖预处理语句对 LIMIT ? 的支持
    const rows = await this.database.query<RowDataPacket[]>(
      `SELECT id, room_id AS roomId, sku_code AS skuCode, sku_name AS skuName, operation,
              quantity, quantity_before AS quantityBefore, quantity_after AS quantityAfter,
              unit_price AS unitPrice, amount, order_no AS orderNo, operator, remark,
              created_at AS createdAt
       FROM inventory_ledger ${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    const [count] = await this.database.query<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) AS total FROM inventory_ledger ${where}`,
      params,
    );

    return {
      success: true,
      data: rows.map((row) => this.serializeLedger(row)),
      total: Number(count?.total ?? 0),
      limit,
      offset,
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

  async getAllItems() {
    const records = await Promise.all(
      ROOM_IDS.map(async (roomId) => {
        const table = this.inventoryTable(roomId);
        try {
          const columns = await this.database.query<(RowDataPacket & { Field: string })[]>(`DESCRIBE ${table}`);
          const fields = columns.map((column) => column.Field);
          const orderBy = fields.includes('time') ? 'time' : fields.includes('created_at') ? 'created_at' : 'id';
          // sku_code 由 006 号迁移添加，先探测再决定是否查询，避免整间仓库的物资全部丢失
          const skuColumn = fields.includes('sku_code') ? ', sku_code AS skuCode' : '';
          const rows = await this.database.query<InventoryRow[]>(
            `SELECT home, name, number AS quantity, price AS unitPrice, unity AS unit,
                    content AS notes, time AS updateTime${skuColumn}
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

  // ---------------------------------------------------------------- 内部

  private async sumQuantity(connection: PoolConnection, table: string, name: string): Promise<number> {
    const [rows] = await connection.query<(RowDataPacket & { total: string | number | null })[]>(
      `SELECT COALESCE(SUM(number), 0) AS total FROM ${table} WHERE name = ?`,
      [name],
    );
    return Number(rows[0]?.total ?? 0);
  }

  private async writeLedger(connection: PoolConnection, entries: LedgerEntry[]) {
    if (!entries.length) return;
    const placeholders = entries.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const parameters = entries.flatMap((entry) => [
      entry.roomId,
      entry.skuCode ?? null,
      entry.skuName,
      entry.operation,
      entry.quantity,
      entry.quantityBefore,
      entry.quantityAfter,
      entry.unitPrice ?? null,
      entry.amount ?? null,
      entry.orderNo ?? null,
      entry.operator ?? null,
      entry.remark ?? null,
    ]);
    try {
      await connection.query(
        `INSERT INTO inventory_ledger
         (room_id, sku_code, sku_name, operation, quantity, quantity_before, quantity_after,
          unit_price, amount, order_no, operator, remark)
         VALUES ${placeholders}`,
        parameters,
      );
    } catch (error) {
      if (this.mysqlCode(error) === 'ER_NO_SUCH_TABLE') {
        throw new ServiceUnavailableException('库存流水表不存在，请先执行迁移 005_create_inventory_ledger.sql');
      }
      throw error;
    }
  }

  /** 显式给了 skuCode 就按它取（取不到直接报错）；否则按名称匹配或建档。 */
  private async resolveSku(
    skuCode: string | undefined,
    name: string,
    unit?: string | null,
    price?: number | null,
  ): Promise<SkuView | null> {
    if (skuCode?.trim()) {
      const sku = await this.sku.findByCode(skuCode.trim());
      if (!sku) throw new BadRequestException(`物资不存在：${skuCode}`);
      return sku;
    }
    return this.sku.ensureByName(name, unit ?? null, price ?? null);
  }

  /**
   * 回填库存行上的 sku_code。该列由 006 号迁移添加，未执行时静默跳过 ——
   * 语句级错误不会中断 MySQL 事务，所以这里 catch 是安全的。
   */
  private async linkSkuCode(
    connection: PoolConnection,
    table: string,
    sku: SkuView | null,
    target: { id?: number },
  ) {
    if (!sku?.skuCode) return;
    try {
      if (target.id !== undefined) {
        await connection.query(`UPDATE ${table} SET sku_code = ? WHERE id = ?`, [sku.skuCode, target.id]);
      } else {
        // 批量入库时按物资名统一回填（同时补上历史遗留的空值）
        await connection.query(
          `UPDATE ${table} SET sku_code = ? WHERE name = ? AND (sku_code IS NULL OR sku_code <> ?)`,
          [sku.skuCode, sku.name, sku.skuCode],
        );
      }
    } catch {
      /* 迁移 006 未执行：不影响库存与流水 */
    }
  }

  private serializeLedger(row: RowDataPacket) {
    return {
      ...row,
      quantity: Number(row.quantity),
      quantityBefore: Number(row.quantityBefore),
      quantityAfter: Number(row.quantityAfter),
      unitPrice: row.unitPrice === null ? null : Number(row.unitPrice),
      amount: row.amount === null ? null : Number(row.amount),
    };
  }

  private newOrderNo(prefix: string) {
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    return `${prefix}-${stamp}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
  }

  private requireRoom(roomId: string): RoomId {
    if (!isRoomId(roomId)) throw new BadRequestException('Invalid room ID');
    return roomId;
  }

  private inventoryTable(roomId: RoomId): string {
    return `\`data${roomId}\``;
  }

  private num(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private round2(value: number) {
    return Math.round((Number(value) || 0) * 100) / 100;
  }

  private mysqlDateTime(): string {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * 流水表的 created_at 由 MySQL 的 CURRENT_TIMESTAMP 写入（数据库本地时间），
   * 所以查询边界也要用本地时间，不能用上面那个 UTC 版本。
   */
  private localDateTime(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

  private normalizeTime(value?: string): string | undefined {
    if (!value?.trim()) return undefined;
    const text = value.trim();
    const epoch = /^-?\d+$/.test(text) ? Number(text) : Number.NaN;
    const date = Number.isFinite(epoch) ? new Date(epoch) : new Date(text.includes('T') ? text : text.replace(' ', 'T'));
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`无效的时间格式：${value}`);
    return this.localDateTime(date);
  }

  private mysqlCode(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  }
}
