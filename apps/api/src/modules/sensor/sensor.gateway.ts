import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { WebSocket, WebSocketServer } from 'ws';
import { DatabaseService } from '../../database/database.service';
import { ROOM_IDS, isRoomId } from '../telemetry/telemetry.constants';

interface SensorPayload {
  roomId?: unknown;
  room?: unknown;
  temperature?: unknown;
  wendu?: unknown;
  humidity?: unknown;
  shidu?: unknown;
  timestamp?: unknown;
  time?: unknown;
  sensorId?: unknown;
}

interface SensorReading {
  roomId: string;
  temperature: number;
  humidity: number;
  time: string;
  sensorId?: string;
}

@Injectable()
export class SensorGateway {
  private readonly logger = new Logger(SensorGateway.name);
  private readonly clients = new Set<WebSocket>();
  private readonly server = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  private attached = false;

  constructor(private readonly database: DatabaseService, private readonly config: ConfigService) {
    this.server.on('connection', (socket) => this.handleConnection(socket));
  }

  attach(httpServer: Server) {
    if (this.attached) return;
    this.attached = true;
    httpServer.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      if (url.pathname !== '/ws/sensors') return;
      if (!this.isAuthorized(request, url)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }
      this.server.handleUpgrade(request, socket, head, (client) => this.server.emit('connection', client, request));
    });
    this.logger.log('Sensor WebSocket endpoint available at /ws/sensors');
  }

  health() {
    return { success: true, endpoint: '/ws/sensors', clients: this.clients.size, rooms: ROOM_IDS };
  }

  private handleConnection(socket: WebSocket) {
    this.clients.add(socket);
    this.send(socket, { type: 'connected', endpoint: '/ws/sensors', message: 'Sensor data channel ready' });
    socket.on('message', (raw) => void this.handleMessage(socket, raw.toString()));
    socket.on('close', () => this.clients.delete(socket));
    socket.on('error', () => this.clients.delete(socket));
  }

  private async handleMessage(socket: WebSocket, raw: string) {
    if (raw === 'ping') {
      this.send(socket, { type: 'pong', timestamp: new Date().toISOString() });
      return;
    }

    let payload: SensorPayload;
    try {
      payload = JSON.parse(raw) as SensorPayload;
    } catch {
      this.send(socket, { type: 'error', success: false, code: 'INVALID_JSON', message: 'Message must be valid JSON' });
      return;
    }

    const result = this.validate(payload);
    if (!result.ok) {
      this.send(socket, { type: 'error', success: false, code: 'INVALID_SENSOR_DATA', message: result.message });
      return;
    }

    try {
      await this.database.query(
        `INSERT INTO \`${result.reading.roomId}\` (wendu, shidu, time) VALUES (?, ?, ?)`,
        [result.reading.temperature, result.reading.humidity, result.reading.time],
      );
      const response = { type: 'sensor_data_ack', success: true, data: result.reading, receivedAt: new Date().toISOString() };
      this.send(socket, response);
      this.broadcast({ type: 'sensor_data', data: result.reading });
    } catch (error) {
      this.logger.error(`Failed to persist sensor data for room ${result.reading.roomId}`, error);
      this.send(socket, { type: 'error', success: false, code: 'PERSIST_FAILED', message: 'Sensor data could not be stored' });
    }
  }

  private validate(payload: SensorPayload): { ok: true; reading: SensorReading } | { ok: false; message: string } {
    const roomId = String(payload.roomId ?? payload.room ?? '');
    if (!isRoomId(roomId)) return { ok: false, message: `roomId must be one of: ${ROOM_IDS.join(', ')}` };
    const temperature = Number(payload.temperature ?? payload.wendu);
    const humidity = Number(payload.humidity ?? payload.shidu);
    if (!Number.isFinite(temperature) || temperature < -50 || temperature > 100) return { ok: false, message: 'temperature must be between -50 and 100' };
    if (!Number.isFinite(humidity) || humidity < 0 || humidity > 100) return { ok: false, message: 'humidity must be between 0 and 100' };
    const suppliedTime = payload.timestamp ?? payload.time;
    const date = suppliedTime ? new Date(String(suppliedTime)) : new Date();
    if (Number.isNaN(date.getTime())) return { ok: false, message: 'timestamp must be a valid date' };
    return { ok: true, reading: { roomId, temperature, humidity, time: this.mysqlDateTime(date), sensorId: payload.sensorId ? String(payload.sensorId) : undefined } };
  }

  private broadcast(message: unknown) {
    for (const client of this.clients) this.send(client, message);
  }

  private send(socket: WebSocket, message: unknown) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  private isAuthorized(request: { headers: Record<string, string | string[] | undefined> }, url: URL) {
    const configured = this.config.get<string>('SENSOR_WS_TOKEN');
    const expected = configured && !configured.startsWith('replace-with-') ? configured : undefined;
    if (!expected) return true;
    const header = request.headers.authorization;
    const authorization = Array.isArray(header) ? header[0] : header;
    const token = url.searchParams.get('token') ?? (authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined);
    return token === expected;
  }

  private mysqlDateTime(date: Date) {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
}
