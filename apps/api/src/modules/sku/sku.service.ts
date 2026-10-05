import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { DatabaseService } from '../../database/database.service';
import { ROOM_IDS } from '../telemetry/telemetry.constants';
import { CreateSkuDto, SkuQueryDto, UpdateSkuDto } from './dto/sku.dto';

type SkuRow = RowDataPacket & {
  id: number;
  skuCode: string | null;
  name: string;
  spec: string;
  category: string | null;
  unit: string | null;
  barcode: string | null;
  supplier: string | null;
  safetyStock: string | number;
  price: string | number;
  status: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

/** 从某房间库存表按物资名聚合出来的行 */
type InventoryNameRow = RowDataPacket & { name: string; unity: string | null; price: number | null };

/** 某房间按 sku_code 汇总的库存量 */
type InventorySummaryRow = RowDataPacket & { skuCode: string | null; name: string; quantity: string | number };

export interface SkuView {
  id: number;
  skuCode: string | null;
  name: string;
  spec: string;
  category: string | null;
  unit: string | null;
  barcode: string | null;
  supplier: string | null;
  safetyStock: number;
  price: number;
  status: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

const COLUMNS = `
  id, sku_code AS skuCode, name, spec, category, unit, barcode, supplier,
  safety_stock AS safetyStock, price, status, remark,
  created_at AS createdAt, updated_at AS updatedAt
`;

/**
 * 物资主数据（SKU）。
 *
 * 编码由自增 id 派生（SKU-000001），插入时先写 NULL 再回填 —— MySQL 的唯一索引
 * 允许多个 NULL，所以并发插入不会撞唯一键，而编码本身来自唯一 id，也不会重复。
 */
@Injectable()
export class SkuService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async list(query: SkuQueryDto) {
    try {
      return await this.listInner(query);
    } catch (error) {
      if (this.mysqlCode(error) === 'ER_NO_SUCH_TABLE') {
        throw new ServiceUnavailableException('物资主数据表不存在，请先执行迁移 004_create_sku_table.sql');
      }
      throw error;
    }
  }

  private async listInner(query: SkuQueryDto) {
    const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 200);
    const offset = Math.max(Number(query.offset ?? 0) || 0, 0);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.keyword?.trim()) {
      const like = `%${query.keyword.trim()}%`;
      conditions.push('(name LIKE ? OR sku_code LIKE ? OR barcode LIKE ? OR spec LIKE ?)');
      params.push(like, like, like, like);
    }
    if (query.category?.trim()) {
      conditions.push('category = ?');
      params.push(query.category.trim());
    }
    if (query.includeInactive !== 'true') conditions.push('status = 1');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // limit/offset 已在上方收敛为整数，直接内联以避免预处理语句对 LIMIT ? 的差异
    const rows = await this.database.query<SkuRow[]>(
      `SELECT ${COLUMNS} FROM sku ${where} ORDER BY name ASC, spec ASC LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    const [count] = await this.database.query<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) AS total FROM sku ${where}`,
      params,
    );

    return { success: true, data: rows.map((row) => this.serialize(row)), total: Number(count?.total ?? 0), limit, offset };
  }

  async findByCode(skuCode: string): Promise<SkuView | null> {
    const rows = await this.database.query<SkuRow[]>(`SELECT ${COLUMNS} FROM sku WHERE sku_code = ? LIMIT 1`, [skuCode]);
    return rows[0] ? this.serialize(rows[0]) : null;
  }

  async findByCodeOrFail(skuCode: string) {
    const sku = await this.findByCode(skuCode);
    if (!sku) throw new NotFoundException(`物资不存在：${skuCode}`);
    return { success: true, data: sku };
  }

  async create(input: CreateSkuDto) {
    const name = input.name.trim();
    if (!name) throw new BadRequestException('name is required');
    const spec = (input.spec ?? '').trim();

    const existing = await this.findByNameSpec(name, spec);
    if (existing) {
      throw new ConflictException(`物资「${name}${spec ? ` / ${spec}` : ''}」已存在，编码 ${existing.skuCode}`);
    }

    try {
      const created = await this.insert(name, spec, {
        category: input.category, unit: input.unit, barcode: input.barcode,
        supplier: input.supplier, safetyStock: input.safetyStock, price: input.price, remark: input.remark,
      });
      return { success: true, message: '物资已建档', data: created };
    } catch (error) {
      // 并发插入撞上 UNIQUE(name, spec)：把已存在的那条返回给调用方即可
      if (this.mysqlCode(error) !== 'ER_DUP_ENTRY') throw error;
      const raced = await this.findByNameSpec(name, spec);
      if (raced) throw new ConflictException(`物资「${name}${spec ? ` / ${spec}` : ''}」已存在，编码 ${raced.skuCode}`);
      throw error;
    }
  }

  async update(skuCode: string, input: UpdateSkuDto) {
    const existing = await this.findByCode(skuCode);
    if (!existing) throw new NotFoundException(`物资不存在：${skuCode}`);

    const map: Array<[string, unknown]> = [];
    const assign = (column: string, value: unknown) => {
      if (value !== undefined) map.push([column, value]);
    };

    assign('name', input.name?.trim());
    assign('spec', input.spec?.trim());
    assign('category', input.category);
    assign('unit', input.unit);
    assign('barcode', input.barcode);
    assign('supplier', input.supplier);
    assign('safety_stock', input.safetyStock);
    assign('price', input.price);
    assign('status', input.status);
    assign('remark', input.remark);

    if (!map.length) return { success: true, data: existing };

    try {
      await this.database.query(
        `UPDATE sku SET ${map.map(([column]) => `${column} = ?`).join(', ')} WHERE sku_code = ?`,
        [...map.map(([, value]) => value), skuCode],
      );
    } catch (error) {
      if (this.mysqlCode(error) === 'ER_DUP_ENTRY') {
        throw new ConflictException('已存在同名同规格的物资');
      }
      throw error;
    }

    return { success: true, message: '物资已更新', data: await this.findByCode(skuCode) };
  }

  /** 停用而非物理删除：历史流水仍要能指回这条主数据。 */
  async deactivate(skuCode: string) {
    const result = await this.database.query<ResultSetHeader>('UPDATE sku SET status = 0 WHERE sku_code = ?', [skuCode]);
    if (result.affectedRows === 0) throw new NotFoundException(`物资不存在：${skuCode}`);
    return { success: true, message: '物资已停用', data: { skuCode } };
  }

  /**
   * 按名称取物资，不存在就建档。出入库走这里，保证流水永远有 sku_code 可关联。
   * 传入 unit / price 只用于首次建档时的默认值，不会覆盖已有主数据。
   */
  async ensureByName(rawName: string, unit?: string | null, price?: number | null): Promise<SkuView | null> {
    try {
      return await this.ensureByNameInner(rawName, unit, price);
    } catch (error) {
      // 迁移 004 未执行时给出可操作的提示，而不是把裸的 SQL 错误抛到前端
      if (this.mysqlCode(error) === 'ER_NO_SUCH_TABLE') {
        throw new ServiceUnavailableException('物资主数据表不存在，请先执行迁移 004_create_sku_table.sql');
      }
      throw error;
    }
  }

  private async ensureByNameInner(rawName: string, unit?: string | null, price?: number | null): Promise<SkuView | null> {
    const name = rawName?.trim();
    if (!name) return null;

    const existing = (await this.findByNameSpec(name, '')) ?? (await this.findByName(name));
    if (existing) return existing;

    try {
      return await this.insert(name, '', { unit, price: price ?? undefined });
    } catch (error) {
      if (this.mysqlCode(error) !== 'ER_DUP_ENTRY') throw error;
      return (await this.findByNameSpec(name, '')) ?? (await this.findByName(name));
    }
  }

  /**
   * 一次性把现有库存表里出现过的物资录入主数据，并回填各表的 sku_code。
   * 逐房间 try/catch：某个房间的库存表不存在时跳过，不影响其它房间。
   */
  async syncFromInventory() {
    let processed = 0;
    let linked = 0;
    let created = 0;
    const skippedRooms: string[] = [];

    for (const roomId of ROOM_IDS) {
      const table = `\`data${roomId}\``;
      let rows: InventoryNameRow[];

      try {
        rows = await this.database.query<InventoryNameRow[]>(`SELECT name, MAX(unity) AS unity, MAX(price) AS price
          FROM ${table} WHERE name IS NOT NULL AND name <> '' GROUP BY name`);
      } catch {
        skippedRooms.push(roomId);
        continue;
      }

      for (const row of rows) {
        const before = await this.findByName(row.name);
        const sku = await this.ensureByName(row.name, row.unity, row.price != null ? Number(row.price) : null);
        if (!sku?.skuCode) continue;
        if (!before) created += 1;
        processed += 1;

        // sku_code 列由 006 号迁移添加；没执行也不影响出入库，这里静默跳过
        try {
          const result = await this.database.query<ResultSetHeader>(
            `UPDATE ${table} SET sku_code = ? WHERE name = ? AND (sku_code IS NULL OR sku_code <> ?)`,
            [sku.skuCode, row.name, sku.skuCode],
          );
          linked += result.affectedRows;
        } catch { /* 迁移 006 未执行 */ }
      }
    }

    return {
      success: true,
      message: '库存物资已同步到主数据',
      data: { processed, created, linked, skippedRooms },
    };
  }

  /** 统计每个物资在各房间的可用总量，用于主数据页展示。 */
  async stockSummary() {
    try {
      return await this.stockSummaryInner();
    } catch (error) {
      if (this.mysqlCode(error) === 'ER_NO_SUCH_TABLE') {
        throw new ServiceUnavailableException('物资主数据表不存在，请先执行迁移 004_create_sku_table.sql');
      }
      throw error;
    }
  }

  private async stockSummaryInner() {
    const summary = new Map<string, number>();

    for (const roomId of ROOM_IDS) {
      let rows: InventorySummaryRow[];
      try {
        rows = await this.database.query<InventorySummaryRow[]>(
          `SELECT sku_code AS skuCode, name, SUM(number) AS quantity FROM \`data${roomId}\` WHERE number > 0 GROUP BY sku_code, name`,
        );
      } catch {
        continue;
      }
      for (const row of rows) {
        const quantity = Number(row.quantity ?? 0);
        if (row.skuCode) summary.set(row.skuCode, (summary.get(row.skuCode) ?? 0) + quantity);
      }
    }

    return { success: true, data: Object.fromEntries(summary) };
  }

  // ---------------------------------------------------------------- 内部

  private async insert(
    name: string,
    spec: string,
    extra: { category?: string; unit?: string | null; barcode?: string; supplier?: string; safetyStock?: number; price?: number; remark?: string },
  ): Promise<SkuView> {
    const result = await this.database.query<ResultSetHeader>(
      `INSERT INTO sku (sku_code, name, spec, category, unit, barcode, supplier, safety_stock, price, remark)
       VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, spec,
        extra.category ?? null, extra.unit ?? null, extra.barcode ?? null, extra.supplier ?? null,
        extra.safetyStock ?? 0, extra.price ?? 0, extra.remark ?? null,
      ],
    );

    const skuCode = this.formatCode(result.insertId);
    await this.database.query('UPDATE sku SET sku_code = ? WHERE id = ?', [skuCode, result.insertId]);

    const created = await this.findByCode(skuCode);
    if (!created) throw new Error('SKU 创建后无法读回');
    return created;
  }

  private async findByNameSpec(name: string, spec: string) {
    const rows = await this.database.query<SkuRow[]>(
      `SELECT ${COLUMNS} FROM sku WHERE name = ? AND spec = ? LIMIT 1`, [name, spec],
    );
    return rows[0] ? this.serialize(rows[0]) : null;
  }

  private async findByName(name: string) {
    const rows = await this.database.query<SkuRow[]>(
      `SELECT ${COLUMNS} FROM sku WHERE name = ? ORDER BY status DESC, id ASC LIMIT 1`, [name],
    );
    return rows[0] ? this.serialize(rows[0]) : null;
  }

  private formatCode(id: number) {
    return `SKU-${String(id).padStart(6, '0')}`;
  }

  private serialize(row: SkuRow): SkuView {
    return {
      ...row,
      safetyStock: Number(row.safetyStock ?? 0),
      price: Number(row.price ?? 0),
      status: Number(row.status ?? 1),
    };
  }

  private mysqlCode(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  }
}
