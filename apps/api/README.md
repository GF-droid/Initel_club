# Initel Club API

NestJS modular backend for telemetry, inventory, authentication, AI and sensor ingestion features.

## Development

From the repository root:

```powershell
npm.cmd install --prefix apps/api
npm.cmd run dev:api
```

Run the frontend and backend together:

```powershell
npm.cmd run dev:full
```

The API development command compiles TypeScript before it starts the NestJS process. After changing backend code, stop any previous API process and run the command again. Do not start the API with `tsx watch src/main.ts`, because its decorator metadata is not reliable for this project.

The API listens at `http://localhost:15010/api/v1` and Swagger documentation is available at `http://localhost:15010/api/docs`.

## Configuration

Copy `.env.example` to `.env` in the repository root and provide database, JWT and optional Moonshot API settings. The real `.env` file is ignored by Git.

## Authentication setup

Authentication requires the `users` table defined in `database/migrations/001_create_users.sql`. Review and apply that migration explicitly before enabling registration or login. Passwords are stored only as bcrypt hashes.

## Modules

- `telemetry`: room temperature and humidity data
- `inventory`: inbound, outbound and stock queries
- `auth`: registration, bcrypt verification and JWT issuance
- `ai`: DeepSeek-compatible chat and report endpoints
- `health`: service and database health check

## Sensor WebSocket

The API accepts sensor readings at `ws://<host>:<PORT>/ws/sensors`. Send one JSON message per reading:

```json
{
  "roomId": "101",
  "temperature": 24.6,
  "humidity": 52.3,
  "timestamp": "2026-08-31T12:30:00+08:00",
  "sensorId": "sensor-101"
}
```

`roomId` must be one of the configured rooms (`101`, `102`, `108`, `109`, `113`, `115`, `116`, `117`, `118`, `119`). The service validates ranges, stores valid readings in that room's telemetry table, returns a `sensor_data_ack`, and broadcasts `sensor_data` to connected clients. Send `ping` to receive a `pong`. Connection status is available at `GET /api/v1/sensors/health`.

Set `SENSOR_WS_TOKEN` in `.env` to protect the endpoint. A device can then connect with `?token=<token>` or an `Authorization: Bearer <token>` header. When the variable is empty, token authentication is disabled for local testing.

## Optional MQTT transport

MQTT is an additional hardware transport; the WebSocket endpoint remains available. Leave `MQTT_URL` empty to use WebSocket only. When MQTT is configured, devices publish to `initel/devices/<roomId>/up` (or the configured `MQTT_UP_TOPIC`) and subscribe to `initel/devices/<roomId>/down` (or `MQTT_DOWN_TOPIC`). The JSON payloads are unchanged: `telemetry`, `smoke_alarm`, and `air_conditioner_command_ack` are sent upstream; `air_conditioner_command` is sent downstream.

```env
MQTT_URL=mqtt://127.0.0.1:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=initel-api
MQTT_UP_TOPIC=initel/devices/+/up
MQTT_DOWN_TOPIC=initel/devices/{roomId}/down
MQTT_DEVICE_TTL_MS=90000
MQTT_RECONNECT_PERIOD_MS=5000
MQTT_CONNECT_TIMEOUT_MS=10000
```

The MQTT client automatically reconnects after network loss. `MQTT_RECONNECT_PERIOD_MS` controls the retry interval and `MQTT_CONNECT_TIMEOUT_MS` controls each connection attempt. An MQTT device is considered online after an upstream message and remains online for `MQTT_DEVICE_TTL_MS` (default 90 seconds). The existing HTTP air-conditioner endpoint automatically selects MQTT for an MQTT-online room and falls back to WebSocket for WebSocket-online rooms. Use `GET /api/v1/sensors/health` to inspect MQTT connection status and the latest error.

Example upstream telemetry:

```json
{
  "type": "telemetry",
  "messageId": "esp32-101-000001",
  "roomId": "101",
  "temperature": 24.5,
  "humidity": 54.3,
  "sensorId": "esp32-101",
  "timestamp": "2026-09-02T12:00:00Z"
}
```

Example downstream air-conditioner command and upstream acknowledgement are the same JSON objects shown below for WebSocket.

## Air Conditioner Commands

The management frontend sends a full command to the HTTP API. The API forwards this exact command through the corresponding room's sensor WebSocket connection and waits up to 10 seconds for a device acknowledgement.

```http
POST /api/v1/air-conditioners/101/commands
Content-Type: application/json

{
  "power": true,
  "targetTemperature": 24,
  "mode": "cool",
  "source": "manual"
}
```

The accepted response contains the generated `commandId` and `status: "pending"`. The ESP32 must return this message on the same WebSocket connection:

```json
{
  "type": "air_conditioner_command_ack",
  "commandId": "the-command-id-from-the-server",
  "roomId": "101",
  "success": true,
  "actualPower": true,
  "actualTemperature": 24,
  "message": "Command executed"
}
```

The server writes the final success or failure result to `operation_logs`. A missing acknowledgement after 10 seconds, an offline device, or a disconnected device is recorded as a failed operation.
