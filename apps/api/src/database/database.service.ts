import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool, PoolConnection } from 'mysql2/promise';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly config: ConfigService) {
    this.pool = createPool({
      host: this.config.getOrThrow<string>('DB_HOST'),
      port: Number(this.config.get<string>('DB_PORT') ?? 3306),
      user: this.config.getOrThrow<string>('DB_USER'),
      password: this.config.getOrThrow<string>('DB_PASSWORD'),
      database: this.config.getOrThrow<string>('DB_NAME'),
      waitForConnections: true,
      connectionLimit: Number(this.config.get<string>('DB_CONNECTION_LIMIT') ?? 10),
      queueLimit: 0,
      dateStrings: true,
    });
  }

  async query<T = unknown>(sql: string, parameters: any[] = []): Promise<T> {
    const [rows] = await this.pool.execute(sql, parameters);
    return rows as T;
  }

  getConnection(): Promise<PoolConnection> {
    return this.pool.getConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
