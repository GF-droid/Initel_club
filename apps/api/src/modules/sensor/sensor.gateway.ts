import { ConflictException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { OperationLogsService } from '../operation-logs/operation-logs.service';
import { ROOM_IDS, RoomId, isRoomId } from '../telemetry/telemetry.constants';
import { AirConditionerCommandDto } from '../air-conditioner/dto/air-conditioner-command.dto';
import { MqttService } from './mqtt.service';

interface SensorPayload { type?: unknown; roomId?: unknown; room?: unknown; temperature?: unknown; wendu?: unknown; humidity?: unknown; shidu?: unknown; timestamp?: unknown; time?: unknown; sensorId?: unknown; messageId?: unknown; commandId?: unknown; success?: unknown; actualPower?: unknown; actualTemperature?: unknown; message?: unknown; alarm?: unknown }
interface SensorReading { roomId: RoomId; temperature: number; humidity: number; time: string; sensorId?: string }
export interface SmokeStatus { roomId: RoomId; alarm: boolean; sensorId?: string; message: string; timestamp: string; updatedAt: string }
export interface AirConditionerCommand { type: 'air_conditioner_command'; commandId: string; roomId: RoomId; power: boolean; targetTemperature: number; mode: 'cool' }
interface PendingCommand { command: AirConditionerCommand; source: 'manual' | 'smart'; operator: string; requestedAt: string; timeout: NodeJS.Timeout }
export interface CommandResult { commandId: string; roomId: RoomId; status: 'pending' | 'success' | 'failed' | 'timeout'; success: boolean | null; message: string; command: AirConditionerCommand; requestedAt: string; completedAt?: string }

@Injectable()
export class SensorGateway {
  private readonly logger = new Logger(SensorGateway.name);
  private readonly pendingCommands = new Map<string, PendingCommand>();
  private readonly commandResults = new Map<string, CommandResult>();
  private readonly messageIds = new Map<string, number>();
  private readonly smokeStates = new Map<RoomId, SmokeStatus>();

  constructor(private readonly database: DatabaseService, private readonly operationLogs: OperationLogsService, private readonly mqtt: MqttService) {
    this.mqtt.setMessageHandler((roomId, payload) => void this.handleMqttMessage(roomId, payload));
  }

  health() { return { success: true, transport: 'mqtt', pendingCommands: this.pendingCommands.size, mqtt: this.mqtt.health(), rooms: ROOM_IDS }; }

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
    const source = input.source ?? 'manual';
    const operator = input.operator ?? 'admin';
    const command = this.createCommand(roomId, input);
    if (!this.mqtt.isRoomOnline(roomId)) {
      await this.recordCommandResult(command, source, operator, false, '设备离线，未下发控制指令');
      throw new ServiceUnavailableException(`Room ${roomId} MQTT device is offline`);
    }
    if ([...this.pendingCommands.values()].some((pending) => pending.command.roomId === roomId)) throw new ConflictException(`Room ${roomId} already has a pending command`);
    const requestedAt = new Date().toISOString();
    const timeout = setTimeout(() => void this.failCommand(command.commandId, '设备未在 10 秒内返回执行结果'), 10_000);
    this.pendingCommands.set(command.commandId, { command, source, operator, requestedAt, timeout });
    this.commandResults.set(command.commandId, { commandId: command.commandId, roomId, status: 'pending', success: null, message: '控制指令已下发，等待设备回执', command, requestedAt });
    if (!this.mqtt.publishToRoom(roomId, command)) {
      await this.failCommand(command.commandId, 'MQTT 当前未连接');
      throw new ServiceUnavailableException('MQTT broker is offline');
    }
    return { success: true, status: 'pending', transport: 'mqtt', command, requestedAt, message: '控制指令已通过 MQTT 下发，等待设备回执' };
  }

  getCommandStatus(commandId: string) { return this.commandResults.get(commandId) ?? null; }

  private async handleMqttMessage(roomId: RoomId, payload: Record<string, unknown>) {
    const message = { ...payload, roomId } as SensorPayload;
    if (message.type === 'air_conditioner_command_ack') return this.handleCommandAcknowledgement(roomId, message);
    if (message.type === 'smoke_alarm') return this.handleSmokeAlarm(roomId, message);
    if (message.type && message.type !== 'telemetry') return this.publish(roomId, { type: 'error', success: false, code: 'UNKNOWN_MESSAGE_TYPE', message: 'Supported types: telemetry, smoke_alarm, air_conditioner_command_ack' });
    return this.handleTelemetry(roomId, message);
  }

  private async handleTelemetry(roomId: RoomId, payload: SensorPayload) {
    const result = this.validateTelemetry({ ...payload, roomId });
    if (!result.ok) return this.publish(roomId, { type: 'error', success: false, code: 'INVALID_SENSOR_DATA', message: result.message, received: { roomId, temperature: payload.temperature ?? payload.wendu, humidity: payload.humidity ?? payload.shidu, type: payload.type } });
    if (this.hasSeenMessage(result.messageId)) return this.publish(roomId, { type: 'sensor_data_ack', success: true, duplicate: true, code: 'DUPLICATE_MESSAGE', message: '消息已处理过，未重复写入数据库', messageId: result.messageId, data: result.reading, receivedAt: new Date().toISOString() });
    try {
      await this.database.query(`INSERT INTO \`${result.reading.roomId}\` (wendu, shidu, time) VALUES (?, ?, ?)`, [result.reading.temperature, result.reading.humidity, result.reading.time]);
      this.rememberMessage(result.messageId);
      return this.publish(roomId, { type: 'sensor_data_ack', success: true, messageId: result.messageId, data: result.reading, receivedAt: new Date().toISOString() });
    } catch (error) {
      const dbError = error as { code?: string; sqlMessage?: string; message?: string };
      this.logger.error(`Failed to persist telemetry for room ${roomId}: ${dbError.code ?? 'UNKNOWN'} ${dbError.sqlMessage ?? dbError.message ?? ''}`);
      return this.publish(roomId, { type: 'error', success: false, code: 'PERSIST_FAILED', message: 'Sensor data could not be stored', databaseCode: dbError.code ?? 'UNKNOWN' });
    }
  }

  private async handleSmokeAlarm(roomId: RoomId, payload: SensorPayload) {
    const sensorId = payload.sensorId === undefined ? undefined : String(payload.sensorId).trim();
    if (typeof payload.alarm !== 'boolean') return this.publish(roomId, { type: 'error', success: false, code: 'INVALID_SMOKE_ALARM', message: 'alarm must be a boolean' });
    if (!sensorId || sensorId.length > 128) return this.publish(roomId, { type: 'error', success: false, code: 'INVALID_SMOKE_ALARM', message: 'sensorId must be 1-128 characters' });
    const date = payload.timestamp ?? payload.time ? new Date(String(payload.timestamp ?? payload.time)) : new Date();
    if (Number.isNaN(date.getTime())) return this.publish(roomId, { type: 'error', success: false, code: 'INVALID_SMOKE_ALARM', message: 'timestamp must be a valid date' });
    const messageId = payload.messageId === undefined ? undefined : String(payload.messageId).trim();
    if (this.hasSeenMessage(messageId)) return this.publish(roomId, { type: 'smoke_alarm_ack', success: true, duplicate: true, code: 'DUPLICATE_MESSAGE', messageId, roomId, alarm: payload.alarm });
    const current = this.smokeStates.get(roomId);
    const changed = !current || current.alarm !== payload.alarm;
    const message = typeof payload.message === 'string' && payload.message.trim() ? payload.message.trim() : payload.alarm ? 'Smoke detected' : 'Smoke cleared';
    const status: SmokeStatus = { roomId, alarm: payload.alarm, sensorId, message, timestamp: date.toISOString(), updatedAt: new Date().toISOString() };
    this.smokeStates.set(roomId, status);
    this.rememberMessage(messageId);
    if (changed) await this.operationLogs.create({ operationType: 'smoke_alarm', roomId, action: payload.alarm ? '烟雾报警触发' : '烟雾报警恢复', success: true, message, operator: sensorId, details: { sensorId, alarm: payload.alarm, messageId, timestamp: status.timestamp } });
    return this.publish(roomId, { type: 'smoke_alarm_ack', success: true, changed, messageId, data: status, message: changed ? '烟雾状态已记录' : '状态未变化，未重复记录' });
  }

  private async handleCommandAcknowledgement(roomId: RoomId, payload: SensorPayload) {
    const commandId = typeof payload.commandId === 'string' ? payload.commandId : '';
    const pending = this.pendingCommands.get(commandId);
    if (!pending) return this.publish(roomId, { type: 'error', success: false, code: 'UNKNOWN_COMMAND', message: 'No pending command matches commandId' });
    if (pending.command.roomId !== roomId) return this.publish(roomId, { type: 'error', success: false, code: 'ROOM_MISMATCH', message: 'roomId does not match the pending command' });
    clearTimeout(pending.timeout); this.pendingCommands.delete(commandId);
    const success = payload.success === true;
    const message = typeof payload.message === 'string' ? payload.message : success ? '设备已执行控制指令' : '设备执行控制指令失败';
    await this.recordCommandResult(pending.command, pending.source, pending.operator, success, message, { actualPower: payload.actualPower, actualTemperature: payload.actualTemperature });
    this.commandResults.set(commandId, { ...this.commandResults.get(commandId)!, status: success ? 'success' : 'failed', success, message, completedAt: new Date().toISOString() });
    return this.publish(roomId, { type: 'air_conditioner_command_ack_received', commandId, success });
  }

  private async failCommand(commandId: string, message: string) {
    const pending = this.pendingCommands.get(commandId);
    if (!pending) return;
    clearTimeout(pending.timeout); this.pendingCommands.delete(commandId);
    await this.recordCommandResult(pending.command, pending.source, pending.operator, false, message);
    this.commandResults.set(commandId, { ...this.commandResults.get(commandId)!, status: message.includes('10 秒') ? 'timeout' : 'failed', success: false, message, completedAt: new Date().toISOString() });
  }

  private createCommand(roomId: RoomId, input: AirConditionerCommandDto): AirConditionerCommand { return { type: 'air_conditioner_command', commandId: randomUUID(), roomId, power: input.power, targetTemperature: input.targetTemperature, mode: input.mode }; }
  private async recordCommandResult(command: AirConditionerCommand, source: string, operator: string, success: boolean, message: string, actual: Record<string, unknown> = {}) { await this.operationLogs.create({ operationType: 'air_conditioning', roomId: command.roomId, action: command.power ? '开启并设置空调' : '关闭空调', success, message, operator, details: { commandId: command.commandId, source, power: command.power, targetTemperature: command.targetTemperature, mode: command.mode, ...actual } }); }

  private validateTelemetry(payload: SensorPayload): { ok: true; reading: SensorReading; messageId?: string } | { ok: false; message: string } {
    const roomId = String(payload.roomId ?? payload.room ?? '');
    if (!isRoomId(roomId)) return { ok: false, message: `roomId must be one of: ${ROOM_IDS.join(', ')}` };
    const temperature = Number(payload.temperature ?? payload.wendu); const humidity = Number(payload.humidity ?? payload.shidu);
    if (!Number.isFinite(temperature) || temperature < -50 || temperature > 100) return { ok: false, message: 'temperature must be between -50 and 100' };
    if (!Number.isFinite(humidity) || humidity < 0 || humidity > 100) return { ok: false, message: 'humidity must be between 0 and 100' };
    const date = payload.timestamp ?? payload.time ? new Date(String(payload.timestamp ?? payload.time)) : new Date();
    if (Number.isNaN(date.getTime())) return { ok: false, message: 'timestamp must be a valid date' };
    const messageId = payload.messageId === undefined ? undefined : String(payload.messageId).trim();
    if (messageId !== undefined && (!messageId || messageId.length > 128)) return { ok: false, message: 'messageId must be 1-128 characters' };
    if (payload.sensorId !== undefined && String(payload.sensorId).length > 128) return { ok: false, message: 'sensorId must be at most 128 characters' };
    return { ok: true, messageId, reading: { roomId, temperature, humidity, time: this.mysqlDateTime(date), sensorId: payload.sensorId ? String(payload.sensorId) : undefined } };
  }

  private hasSeenMessage(messageId?: string) { if (!messageId) return false; const now = Date.now(); for (const [id, expiresAt] of this.messageIds) if (expiresAt <= now) this.messageIds.delete(id); return this.messageIds.has(messageId); }
  private rememberMessage(messageId?: string) { if (messageId) this.messageIds.set(messageId, Date.now() + 10 * 60_000); }
  private publish(roomId: RoomId, message: unknown) { return this.mqtt.publishToRoom(roomId, message); }
  private mysqlDateTime(date: Date) { const pad = (value: number) => String(value).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`; }
}
