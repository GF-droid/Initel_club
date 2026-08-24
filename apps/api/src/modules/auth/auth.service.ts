import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { DatabaseService } from '../../database/database.service';
import { LoginDto, RegisterDto } from './dto/login.dto';

type UserRow = RowDataPacket & {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async login(input: LoginDto) {
    try {
      const users = await this.database.query<UserRow[]>(
        'SELECT id, username, email, password_hash FROM users WHERE username = ? LIMIT 1',
        [input.username],
      );
      const user = users[0];
      if (!user || !(await bcrypt.compare(input.password, user.password_hash))) {
        throw new UnauthorizedException('Invalid username or password');
      }

      const publicUser = { id: user.id, username: user.username, email: user.email };
      const accessToken = await this.jwt.signAsync({ sub: user.id, username: user.username });
      return { success: true, data: { user: publicUser, accessToken } };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      if (this.mysqlCode(error) === 'ER_NO_SUCH_TABLE') {
        throw new ServiceUnavailableException(
          'Authentication is not initialized. Apply database/migrations/001_create_users.sql first.',
        );
      }
      throw error;
    }
  }

  async register(input: RegisterDto) {
    try {
      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await this.database.query<ResultSetHeader>(
        'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
        [input.username, input.email, passwordHash],
      );
      return {
        success: true,
        code: 200,
        message: 'Registration successful',
        data: { id: result.insertId, username: input.username, email: input.email },
      };
    } catch (error) {
      const code = this.mysqlCode(error);
      if (code === 'ER_DUP_ENTRY') throw new ConflictException('Username or email already exists');
      if (code === 'ER_NO_SUCH_TABLE') {
        throw new ServiceUnavailableException(
          'Authentication is not initialized. Apply database/migrations/001_create_users.sql first.',
        );
      }
      throw error;
    }
  }

  private mysqlCode(error: unknown): string | undefined {
    return typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : undefined;
  }
}
