import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mqtt, { MqttClient } from 'mqtt';
import { isRoomId, RoomId } from '../telemetry/telemetry.constants';

export type MqttMessageHandler = (roomId: RoomId, payload: Record<string, unknown>) => void;

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client?: MqttClient;
  private readonly lastSeen = new Map<RoomId, number>();
  private readonly receivedMessages = new Map<RoomId, string>();
  private readonly deviceTtlMs: number;
  private messageHandler?: MqttMessageHandler;
  private readonly url: string;
  private readonly upTopic: string;
  private readonly downTopic: string;
  private readonly reconnectPeriodMs: number;
  private readonly connectTimeoutMs: number;
  private lastError?: string;
  private reconnectCount = 0;
  private stopping = false;

  constructor(private readonly config: ConfigService) {
    this.url = this.config.get<string>('MQTT_URL') ?? '';
    this.upTopic = this.config.get<string>('MQTT_UP_TOPIC') ?? 'initel/devices/+/up';
    this.downTopic = this.config.get<string>('MQTT_DOWN_TOPIC') ?? 'initel/devices/{roomId}/down';
    this.deviceTtlMs = Math.max(30_000, Number(this.config.get<string>('MQTT_DEVICE_TTL_MS') ?? 90_000));
    this.reconnectPeriodMs = Math.max(1_000, Number(this.config.get<string>('MQTT_RECONNECT_PERIOD_MS') ?? 5_000));
    this.connectTimeoutMs = Math.max(3_000, Number(this.config.get<string>('MQTT_CONNECT_TIMEOUT_MS') ?? 10_000));
  }

  onModuleInit() {
    if (!this.url) {
      this.logger.log('MQTT disabled: MQTT_URL is not configured');
      return;
    }
    const username = this.config.get<string>('MQTT_USERNAME');
    const password = this.config.get<string>('MQTT_PASSWORD');
    this.client = mqtt.connect(this.url, {
      username: username || undefined,
      password: password || undefined,
      clientId: this.config.get<string>('MQTT_CLIENT_ID') || `initel-api-${process.pid}`,
      reconnectPeriod: this.reconnectPeriodMs,
      connectTimeout: this.connectTimeoutMs,
      keepalive: 30,
      resubscribe: true,
      clean: true,
    });
    this.client.on('connect', () => {
      this.reconnectCount = 0;
      this.lastError = undefined;
      this.logger.log(`MQTT connected: ${this.url}`);
      this.client?.subscribe(this.upTopic, { qos: 1 }, (error) => {
        if (error) this.logger.error(`MQTT subscribe failed: ${error.message}`);
        else this.logger.log(`MQTT subscribed: ${this.upTopic}`);
      });
    });
    this.client.on('message', (topic, raw) => this.handleMessage(topic, raw.toString()));
    this.client.on('error', (error) => {
      this.lastError = error.message;
      this.logger.error(`MQTT error: ${error.message}`);
    });
    this.client.on('reconnect', () => {
      this.reconnectCount += 1;
      this.logger.warn(`MQTT reconnecting (attempt ${this.reconnectCount}): ${this.url}`);
    });
    this.client.on('offline', () => this.logger.warn('MQTT connection is offline'));
    this.client.on('close', () => {
      if (!this.stopping) this.logger.warn('MQTT connection closed; automatic reconnect remains enabled');
      this.lastSeen.clear();
    });
  }

  onModuleDestroy() {
    this.stopping = true;
    this.client?.end(true);
  }

  setMessageHandler(handler: MqttMessageHandler) { this.messageHandler = handler; }

  isEnabled() { return Boolean(this.client); }

  health() {
    return {
      enabled: Boolean(this.url),
      connected: Boolean(this.client?.connected),
      reconnectCount: this.reconnectCount,
      reconnectPeriodMs: this.reconnectPeriodMs,
      lastError: this.lastError ?? null,
      upTopic: this.upTopic,
      downTopic: this.downTopic,
      onlineRooms: [...this.lastSeen].filter(([, seenAt]) => Date.now() - seenAt <= this.deviceTtlMs).map(([roomId]) => roomId),
      lastMessageAt: Object.fromEntries(this.receivedMessages),
    };
  }

  isRoomOnline(roomId: string) {
    if (!isRoomId(roomId)) return false;
    const seenAt = this.lastSeen.get(roomId);
    if (!seenAt || Date.now() - seenAt > this.deviceTtlMs) {
      this.lastSeen.delete(roomId);
      return false;
    }
    return true;
  }

  publishToRoom(roomId: RoomId, message: unknown) {
    if (!this.client?.connected) return false;
    const topic = this.downTopic.replace('{roomId}', roomId);
    this.client.publish(topic, JSON.stringify(message), { qos: 1 }, (error) => {
      if (error) this.logger.error(`MQTT publish failed for room ${roomId}: ${error.message}`);
    });
    return true;
  }

  private handleMessage(topic: string, raw: string) {
    const topicRoomId = this.extractRoomId(topic);
    let payload: Record<string, unknown>;
    try { payload = JSON.parse(raw) as Record<string, unknown>; } catch {
      this.logger.warn(`Ignoring invalid MQTT JSON from ${topic}`);
      return;
    }
    payload = this.normalizePayload(payload);
    const roomId = String(payload.roomId ?? topicRoomId ?? '');
    if (!isRoomId(roomId)) {
      this.logger.warn(`Ignoring MQTT message with invalid roomId: ${roomId}`);
      return;
    }
    this.lastSeen.set(roomId, Date.now());
    this.receivedMessages.set(roomId, new Date().toISOString());
    this.messageHandler?.(roomId, payload);
  }

  private normalizePayload(payload: Record<string, unknown>) {
    const nested = payload.data;
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
      return payload;
    }
    const data = nested as Record<string, unknown>;
    const type = payload.type === 'sensor_data' ? 'telemetry' : payload.type ?? data.type ?? 'telemetry';
    return { ...data, ...payload, type };
  }

  private extractRoomId(topic: string) {
    const marker = this.upTopic.indexOf('/+/');
    if (marker >= 0) {
      const prefix = this.upTopic.slice(0, marker + 1);
      const suffix = this.upTopic.slice(marker + 2);
      if (topic.startsWith(prefix) && topic.endsWith(suffix)) {
        return topic.slice(prefix.length, topic.length - suffix.length);
      }
    }
    return topic.match(/^initel\/devices\/([^/]+)\/up$/)?.[1];
  }
}
