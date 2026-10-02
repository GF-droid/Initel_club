import { ConflictException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import { DatabaseService } from '../../database/database.service';
import { OperationLogsService } from '../operation-logs/operation-logs.service';
import { ROOM_IDS, RoomId, isRoomId } from '../telemetry/telemetry.constants';
import { AirConditionerCommandDto } from '../air-conditioner/dto/air-conditioner-command.dto';
import { MqttService } from './mqtt.service';

interface SensorPayload { type?: unknown; roomId?: unknown; room?: unknown; temperature?: unknown; wendu?: unknown; humidity?: unknown; shidu?: unknown; timestamp?: unknown; time?: unknown; sensorId?: unknown; messageId?: unknown; commandId?: unknown; success?: unknown; actualPower?: unknown; actualTemperature?: unknown; message?: unknown; alarm?: unknown }
interface SensorReading { roomId: RoomId; temperature: number; humidity: number; time: string; sensorId?: string }
export interface SmokeStatus { roomId: RoomId; alarm: boolean; sensorId?: string; message: string; timestamp: string; updatedAt: string }
export interface AirConditionerCommand { type: 'air_conditioner_command'; commandId: string; roomId: RoomId; power: boolean; targetTemperature: number; mode: 'cool' }
interface PendingCommand { command: AirConditionerCommand; source: 'manual' | 'smart'; operator: string; requestedAt: string; timeout: NodeJS.Timeout; transport: 'websocket' | 'mqtt' }
export interface CommandResult { commandId: string; roomId: RoomId; status: 'pending' | 'success' | 'failed' | 'timeout'; success: boolean | null; message: string; command: AirConditionerCommand; requestedAt: string; completedAt?: string }
interface RateState { windowStartedAt: number; count: number }

@Injectable()
export class SensorGateway {
  private readonly logger = new Logger(SensorGateway.name);
  private readonly clients = new Set<WebSocket>();
  private readonly roomClients = new Map<RoomId, WebSocket>();
  private readonly mqttSockets = new Map<RoomId, WebSocket>();
  private readonly pendingCommands = new Map<string, PendingCommand>();
  private readonly commandResults = new Map<string, CommandResult>();
  private readonly messageIds = new Map<string, number>();
  private readonly rateStates = new WeakMap<WebSocket, RateState>();
  private readonly smokeStates = new Map<RoomId, SmokeStatus>();
  private readonly server = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  private attached = false;

  constructor(private readonly database: DatabaseService, private readonly config: ConfigService, private readonly operationLogs: OperationLogsService, private readonly mqtt: MqttService) {
    this.server.on('connection', (socket) => this.handleConnection(socket));
    this.mqtt.setMessageHandler((roomId, payload) => this.handleMqttMessage(roomId, payload));
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
    const websocketRooms = [...this.roomClients].filter(([, client]) => this.clients.has(client) && client.readyState === WebSocket.OPEN).map(([roomId]) => roomId);
    const mqttHealth = this.mqtt.health();
    return { success: true, endpoint: '/ws/sensors', clients: this.clients.size, onlineRooms: [...new Set([...websocketRooms, ...mqttHealth.onlineRooms])], pendingCommands: this.pendingCommands.size, mqtt: mqttHealth, rooms: ROOM_IDS };
  }

  getSmokeStatuses(roomIdInput?: string) {
    if (roomIdInput !== undefined) {
      if (!isRoomId(roomIdInput)) return null;
      return this.smokeStates.get(roomIdInput) ?? { roomId: roomIdInput, alarm: false, message: '暂无烟雾报警', timestamp: '', updatedAt: '' };
    }
    return ROOM_IDS.map((roomId) => this.smokeStates.get(roomId) ?? { roomId, alarm: false, message: '正常', timestamp: '', updatedAt: '' });
  }

  async dispatchAirConditionerCommand(roomIdInput: string, input: AirConditionerCommandDto) {
    if (!isRoomId(roomIdInput)) throw new ServiceUnavailableException(`Invalid room ID: ${roomIdInput}`);
    const roomId = roomIdInput;
    const client = this.roomClients.get(roomId);
    const mqttOnline = this.mqtt.isRoomOnline(roomId);
    const websocketOnline = Boolean(client && this.clients.has(client) && client.readyState === WebSocket.OPEN);
    const command: AirConditionerCommand = { type: 'air_conditioner_command', commandId: randomUUID(), roomId, power: input.power, targetTemperature: input.targetTemperature, mode: input.mode };
    const source = input.source ?? 'manual';
    const operator = input.operator ?? 'admin';
    const requestedAt = new Date().toISOString();

    if (!websocketOnline && !mqttOnline) {
      await this.recordCommandResult(command, source, operator, false, '设备离线，未下发控制指令');
      throw new ServiceUnavailableException(`Room ${roomId} sensor device is offline`);
    }
    if ([...this.pendingCommands.values()].some((pending) => pending.command.roomId === roomId)) {
      throw new ConflictException(`Room ${roomId} already has a pending command`);
    }

    const timeout = setTimeout(() => void this.failCommand(command.commandId, '设备未在 10 秒内返回执行结果'), 10_000);
    const transport = mqttOnline ? 'mqtt' : 'websocket';
    this.pendingCommands.set(command.commandId, { command, source, operator, requestedAt, timeout, transport });
    this.commandResults.set(command.commandId, { commandId: command.commandId, roomId, status: 'pending', success: null, message: '控制指令已下发，等待设备回执', command, requestedAt });
    if (transport === 'mqtt') this.mqtt.publishToRoom(roomId, command);
    else this.send(client!, command);
    return { success: true, status: 'pending', command, requestedAt, transport, message: `控制指令已通过 ${transport === 'mqtt' ? 'MQTT' : 'WebSocket'} 下发，等待设备回执` };
  }

  private handleMqttMessage(roomId: RoomId, payload: Record<string, unknown>) {
    const socket = this.getMqttSocket(roomId);
    this.roomClients.set(roomId, socket);
    void this.handleMessage(socket, JSON.stringify({ ...payload, roomId }));
  }

  private getMqttSocket(roomId: RoomId): WebSocket {
    const existing = this.mqttSockets.get(roomId);
    if (existing) return existing;
    const socket = {
      readyState: WebSocket.OPEN,
      send: (raw: string) => {
        try { this.mqtt.publishToRoom(roomId, JSON.parse(raw)); } catch { /* invalid internal response */ }
      },
    } as unknown as WebSocket;
    this.mqttSockets.set(roomId, socket);
    return socket;
  }

  getCommandStatus(commandId: string) {
    const result = this.commandResults.get(commandId);
    if (!result) return null;
    return result;
  }

  private handleConnection(socket: WebSocket) {
    this.clients.add(socket);
    let alive = true;
    const heartbeat = setInterval(() => {
      if (!alive) { socket.terminate(); return; }
      alive = false;
      socket.ping();
    }, 30_000);
    socket.on('pong', () => { alive = true; });
    this.send(socket, { type: 'connected', endpoint: '/ws/sensors', message: 'Sensor data channel ready' });
    socket.on('message', (raw) => void this.handleMessage(socket, raw.toString()));
    socket.on('close', () => { clearInterval(heartbeat); void this.handleDisconnect(socket); });
    socket.on('error', () => void this.handleDisconnect(socket));
  }

  private async handleMessage(socket: WebSocket, raw: string) {
    if (!this.allowMessage(socket)) {
      this.send(socket, { type: 'error', success: false, code: 'RATE_LIMITED', message: 'Too many messages; maximum 120 messages per minute' });
      return;
    }
    if (raw === 'ping') return this.send(socket, { type: 'pong', timestamp: new Date().toISOString() });
    let payload: SensorPayload;
    try { payload = JSON.parse(raw) as SensorPayload; } catch { return this.send(socket, { type: 'error', success: false, code: 'INVALID_JSON', message: 'Message must be valid JSON' }); }
    if (payload.type === 'air_conditioner_command_ack') return void this.handleCommandAcknowledgement(socket, payload);
    if (payload.type === 'smoke_alarm') return void this.handleSmokeAlarm(socket, payload);
    if (payload.type && payload.type !== 'telemetry') return this.send(socket, { type: 'error', success: false, code: 'UNKNOWN_MESSAGE_TYPE', message: 'Supported types: telemetry, smoke_alarm, air_conditioner_command_ack' });
    await this.handleTelemetry(socket, payload);
  }

  private async handleSmokeAlarm(socket: WebSocket, payload: SensorPayload) {
    const roomId = String(payload.roomId ?? payload.room ?? '');
    const sensorId = payload.sensorId === undefined ? undefined : String(payload.sensorId).trim();
    if (!isRoomId(roomId)) return this.send(socket, { type: 'error', success: false, code: 'INVALID_SMOKE_ALARM', message: `roomId must be one of: ${ROOM_IDS.join(', ')}` });
    if (typeof payload.alarm !== 'boolean') return this.send(socket, { type: 'error', success: false, code: 'INVALID_SMOKE_ALARM', message: 'alarm must be a boolean' });
    if (!sensorId || sensorId.length > 128) return this.send(socket, { type: 'error', success: false, code: 'INVALID_SMOKE_ALARM', message: 'sensorId must be 1-128 characters' });
    const date = payload.timestamp ?? payload.time ? new Date(String(payload.timestamp ?? payload.time)) : new Date();
    if (Number.isNaN(date.getTime())) return this.send(socket, { type: 'error', success: false, code: 'INVALID_SMOKE_ALARM', message: 'timestamp must be a valid date' });
    const messageId = payload.messageId === undefined ? undefined : String(payload.messageId).trim();
    if (messageId !== undefined && (!messageId || messageId.length > 128)) return this.send(socket, { type: 'error', success: false, code: 'INVALID_SMOKE_ALARM', message: 'messageId must be 1-128 characters' });
    if (this.hasSeenMessage(messageId)) return this.send(socket, { type: 'smoke_alarm_ack', success: true, duplicate: true, code: 'DUPLICATE_MESSAGE', message: '消息已处理过，未重复记录', messageId, roomId, alarm: payload.alarm });
    this.roomClients.set(roomId, socket);
    const current = this.smokeStates.get(roomId);
    const changed = !current || current.alarm !== payload.alarm;
    const message = typeof payload.message === 'string' && payload.message.trim() ? payload.message.trim() : payload.alarm ? 'Smoke detected' : 'Smoke cleared';
    const status: SmokeStatus = { roomId, alarm: payload.alarm, sensorId, message, timestamp: date.toISOString(), updatedAt: new Date().toISOString() };
    this.smokeStates.set(roomId, status);
    if (messageId) this.rememberMessage(messageId);
    if (changed) {
      await this.operationLogs.create({ operationType: 'smoke_alarm', roomId, action: payload.alarm ? '烟雾报警触发' : '烟雾报警恢复', success: true, message, operator: sensorId, details: { sensorId, alarm: payload.alarm, messageId, timestamp: status.timestamp } });
    }
    this.send(socket, { type: 'smoke_alarm_ack', success: true, changed, messageId, data: status, message: changed ? (payload.alarm ? '烟雾报警已记录' : '烟雾报警已恢复') : '状态未变化，未重复记录' });
  }

  private async handleTelemetry(socket: WebSocket, payload: SensorPayload) {
    const result = this.validateTelemetry(payload);
    if (!result.ok) {
      this.logger.warn(`Invalid telemetry payload: ${JSON.stringify({
        roomId: payload.roomId ?? payload.room,
        temperature: payload.temperature ?? payload.wendu,
        humidity: payload.humidity ?? payload.shidu,
        type: payload.type,
        messageId: payload.messageId,
      })}; ${result.message}`);
      return this.send(socket, {
        type: 'error',
        success: false,
        code: 'INVALID_SENSOR_DATA',
        message: result.message,
        received: {
          roomId: payload.roomId ?? payload.room,
          temperature: payload.temperature ?? payload.wendu,
          humidity: payload.humidity ?? payload.shidu,
          type: payload.type,
        },
      });
    }
    if (this.hasSeenMessage(result.messageId)) {
      return this.send(socket, { type: 'sensor_data_ack', success: true, duplicate: true, code: 'DUPLICATE_MESSAGE', message: '消息已处理过，未重复写入数据库', messageId: result.messageId, data: result.reading, receivedAt: new Date().toISOString() });
    }
    this.roomClients.set(result.reading.roomId, socket);
    try {
      await this.database.query(`INSERT INTO \`${result.reading.roomId}\` (wendu, shidu, time) VALUES (?, ?, ?)`, [result.reading.temperature, result.reading.humidity, result.reading.time]);
      this.rememberMessage(result.messageId);
      this.send(socket, { type: 'sensor_data_ack', success: true, messageId: result.messageId, data: result.reading, receivedAt: new Date().toISOString() });
    } catch (error) {
      const dbError = error as { code?: string; errno?: number; sqlMessage?: string; message?: string };
      this.logger.error(`Failed to persist sensor data for room ${result.reading.roomId}: ${dbError.code ?? 'UNKNOWN'} ${dbError.sqlMessage ?? dbError.message ?? ''}`);
      this.send(socket, {
        type: 'error',
        success: false,
        code: 'PERSIST_FAILED',
        message: 'Sensor data could not be stored',
        databaseCode: dbError.code ?? 'UNKNOWN',
      });
    }
  }

  private async handleCommandAcknowledgement(socket: WebSocket, payload: SensorPayload) {
    const commandId = typeof payload.commandId === 'string' ? payload.commandId : '';
    const pending = this.pendingCommands.get(commandId);
    if (!pending) return this.send(socket, { type: 'error', success: false, code: 'UNKNOWN_COMMAND', message: 'No pending command matches commandId' });
    if (this.roomClients.get(pending.command.roomId) !== socket) return this.send(socket, { type: 'error', success: false, code: 'DEVICE_MISMATCH', message: 'Command acknowledgement came from a different device' });
    const roomId = String(payload.roomId ?? payload.room ?? '');
    if (roomId !== pending.command.roomId) return this.send(socket, { type: 'error', success: false, code: 'ROOM_MISMATCH', message: 'roomId does not match the pending command' });
    clearTimeout(pending.timeout); this.pendingCommands.delete(commandId);
    const success = payload.success === true;
    const message = typeof payload.message === 'string' ? payload.message : success ? '设备已执行控制指令' : '设备执行控制指令失败';
    await this.recordCommandResult(pending.command, pending.source, pending.operator, success, message, { actualPower: payload.actualPower, actualTemperature: payload.actualTemperature });
    this.commandResults.set(commandId, { ...this.commandResults.get(commandId)!, status: success ? 'success' : 'failed', success, message, completedAt: new Date().toISOString() });
    this.send(socket, { type: 'air_conditioner_command_ack_received', commandId, success });
    this.broadcast({ type: 'air_conditioner_command_result', commandId, roomId, success, message });
  }

  private async handleDisconnect(socket: WebSocket) {
    if (!this.clients.delete(socket)) return;
    for (const [roomId, client] of this.roomClients) {
      if (client !== socket) continue;
      this.roomClients.delete(roomId);
      if (!this.mqtt.isRoomOnline(roomId)) {
        for (const [commandId, pending] of this.pendingCommands) if (pending.command.roomId === roomId) await this.failCommand(commandId, '设备连接已断开');
      }
    }
  }

  private async failCommand(commandId: string, message: string) {
    const pending = this.pendingCommands.get(commandId);
    if (!pending) return;
    clearTimeout(pending.timeout); this.pendingCommands.delete(commandId);
    await this.recordCommandResult(pending.command, pending.source, pending.operator, false, message);
    this.commandResults.set(commandId, { ...this.commandResults.get(commandId)!, status: message.includes('10 秒') ? 'timeout' : 'failed', success: false, message, completedAt: new Date().toISOString() });
    this.broadcast({ type: 'air_conditioner_command_result', commandId, roomId: pending.command.roomId, success: false, message });
  }

  private async recordCommandResult(command: AirConditionerCommand, source: string, operator: string, success: boolean, message: string, actual: Record<string, unknown> = {}) {
    await this.operationLogs.create({ operationType: 'air_conditioning', roomId: command.roomId, action: command.power ? '开启并设置空调' : '关闭空调', success, message, operator, details: { commandId: command.commandId, source, power: command.power, targetTemperature: command.targetTemperature, mode: command.mode, ...actual } });
  }

  private validateTelemetry(payload: SensorPayload): { ok: true; reading: SensorReading; messageId?: string } | { ok: false; message: string } {
    const roomId = String(payload.roomId ?? payload.room ?? '');
    if (!isRoomId(roomId)) return { ok: false, message: `roomId must be one of: ${ROOM_IDS.join(', ')}` };
    const rawTemperature = payload.temperature ?? payload.wendu;
    const rawHumidity = payload.humidity ?? payload.shidu;
    const temperature = Number(rawTemperature);
    const humidity = Number(rawHumidity);
    if (!Number.isFinite(temperature) || temperature < -50 || temperature > 100) return { ok: false, message: 'temperature must be between -50 and 100' };
    if (!Number.isFinite(humidity) || humidity < 0 || humidity > 100) return { ok: false, message: 'humidity must be between 0 and 100' };
    const date = payload.timestamp ?? payload.time ? new Date(String(payload.timestamp ?? payload.time)) : new Date();
    if (Number.isNaN(date.getTime())) return { ok: false, message: 'timestamp must be a valid date' };
    const messageId = payload.messageId === undefined ? undefined : String(payload.messageId).trim();
    if (messageId !== undefined && (!messageId || messageId.length > 128)) return { ok: false, message: 'messageId must be 1-128 characters' };
    if (payload.sensorId !== undefined && String(payload.sensorId).length > 128) return { ok: false, message: 'sensorId must be at most 128 characters' };
    return { ok: true, messageId, reading: { roomId, temperature, humidity, time: this.mysqlDateTime(date), sensorId: payload.sensorId ? String(payload.sensorId) : undefined } };
  }

  private hasSeenMessage(messageId?: string): boolean {
    if (!messageId) return false;
    const now = Date.now();
    for (const [id, expiresAt] of this.messageIds) if (expiresAt <= now) this.messageIds.delete(id);
    return this.messageIds.has(messageId);
  }

  private rememberMessage(messageId?: string) {
    if (!messageId) return;
    this.messageIds.set(messageId, Date.now() + 10 * 60_000);
  }

  private allowMessage(socket: WebSocket): boolean {
    const now = Date.now();
    const state = this.rateStates.get(socket);
    if (!state || now - state.windowStartedAt >= 60_000) {
      this.rateStates.set(socket, { windowStartedAt: now, count: 1 });
      return true;
    }
    if (state.count >= 120) return false;
    state.count += 1;
    return true;
  }

  private broadcast(message: unknown) { for (const client of this.clients) this.send(client, message); }
  private send(socket: WebSocket, message: unknown) { if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }
  private isAuthorized(request: { headers: Record<string, string | string[] | undefined> }, url: URL) { const configured = this.config.get<string>('SENSOR_WS_TOKEN'); const expected = configured && !configured.startsWith('replace-with-') ? configured : undefined; if (!expected) return true; const header = request.headers.authorization; const authorization = Array.isArray(header) ? header[0] : header; return (url.searchParams.get('token') ?? (authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined)) === expected; }
  private mysqlDateTime(date: Date) { const pad = (value: number) => String(value).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`; }
}
