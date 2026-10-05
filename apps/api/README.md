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

## Bulk Inbound

`POST /api/v1/inventory/inbound/batch` stores many inbound rows in one request and backs the Excel import on the 入库登记 tab.

```http
POST /api/v1/inventory/inbound/batch
Content-Type: application/json

{
  "items": [
    { "home": "101", "name": "打印纸", "number": 20, "price": 25.5, "unity": "箱", "content": "A4 规格" },
    { "home": "101", "name": "签字笔", "number": 100, "price": 3.5, "unity": "支" }
  ]
}
```

```json
{ "success": true, "message": "Batch inbound completed", "data": { "inserted": 2, "total": 2, "rooms": ["101"] } }
```

`items` accepts 1–1000 entries and each entry is validated exactly like the single-row `POST /inbound`, so an invalid row rejects the whole request with `400`. Because every room keeps its own inventory table, the rows are grouped by `home` and one multi-row `INSERT` is issued per room inside a single transaction: either every row is stored or none is, so a failed import never leaves a half-written file behind. Send the payload in chunks if a file exceeds 1000 rows.

## Sensor MQTT

The API accepts sensor readings on the MQTT topic `initel/devices/<roomId>/up`. Send one JSON message per reading:

```json
{
  "type": "telemetry",
  "roomId": "101",
  "temperature": 24.6,
  "humidity": 52.3,
  "timestamp": "2026-08-31T12:30:00+08:00",
  "sensorId": "sensor-101"
}
```

`roomId` must be one of the configured rooms (`101`, `102`, `108`, `109`, `113`, `115`, `116`, `117`, `118`, `119`). The service validates ranges, stores valid readings in that room's telemetry table, and publishes a `sensor_data_ack` to the room downlink topic. Connection status is available at `GET /api/v1/sensors/health`. The API uses MQTT only for hardware transport and does not fall back to a sensor WebSocket.

MQTT Broker authentication is configured with `MQTT_USERNAME` and `MQTT_PASSWORD`.

## PIR Motion Sensor

A PIR proximity sensor reports on the same uplink topic, `initel/devices/<roomId>/up`:

```json
{
  "type": "pir_motion",
  "roomId": "101",
  "sensorId": "esp32-101",
  "motion": true,
  "timestamp": "2026-10-05T04:12:33Z"
}
```

`motion` must be a boolean and `sensorId` must be 1–128 characters; an optional `messageId` is de-duplicated for 10 minutes, matching the telemetry and smoke-alarm behaviour.

Detection and clear events are appended to the **`operation_logs` table — the same table that stores air-conditioner operations** — so the audit page shows both kinds of event in one timeline. Rows are written with `operation_type = 'motion_detection'`, `action` set to `检测到人员接近` or `人员活动结束`, and `details` carrying `sensorId`, `motion`, `previousState`, `messageId` and `detectedAt`.

The API answers with a `pir_motion_ack` on the room downlink topic:

```json
{ "type": "pir_motion_ack", "success": true, "recorded": true, "changed": true, "roomId": "101", "motion": true, "detectedAt": "2026-10-05T04:12:33.000Z", "data": { "operationType": "motion_detection", "logId": 128, "sensorId": "esp32-101" } }
```

Check `recorded` before assuming a row was written. Three outcomes skip the insert, each with its own `code`:

| `code` | Meaning |
| --- | --- |
| `THROTTLED` | A detection arrived within `MOTION_LOG_COOLDOWN_MS` of the previous one for that room. |
| `NO_ACTIVE_MOTION` | A `motion: false` report arrived while no detection was active, so there was nothing to close. |
| `DUPLICATE_MESSAGE` | The same `messageId` was already processed. |

`MOTION_LOG_COOLDOWN_MS` (default `30000`) caps how often one room can add a motion row. A PIR stays asserted while somebody moves inside the room, so without a cooldown a single visit can fill `operation_logs` with hundreds of near-identical rows. Set it to `0` to store every reported detection. A write failure is reported as `code: "MOTION_LOG_FAILED"` with the MySQL error code in `databaseCode`, and the in-memory motion state is rolled back so the next report is not mistaken for a duplicate.

## MQTT configuration

Devices publish to `initel/devices/<roomId>/up` (or the configured `MQTT_UP_TOPIC`) and subscribe to `initel/devices/<roomId>/down` (or `MQTT_DOWN_TOPIC`). The JSON payloads are unchanged: `telemetry`, `smoke_alarm`, and `air_conditioner_command_ack` are sent upstream; `air_conditioner_command` is sent downstream.

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

The MQTT client automatically reconnects after network loss. `MQTT_RECONNECT_PERIOD_MS` controls the retry interval and `MQTT_CONNECT_TIMEOUT_MS` controls each connection attempt. An MQTT device is considered online after an upstream message and remains online for `MQTT_DEVICE_TTL_MS` (default 90 seconds). The HTTP air-conditioner endpoint sends commands through MQTT. Use `GET /api/v1/sensors/health` to inspect MQTT connection status and the latest error.

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

Example downstream air-conditioner command and upstream acknowledgement are the same JSON objects shown below for MQTT.

## Telemetry Queries Over MQTT

The three read-only telemetry endpoints are also reachable from a device over MQTT. Publish a request to the room uplink topic `initel/devices/<roomId>/up` and the API answers on that room's downlink topic `initel/devices/<roomId>/down`. Query fields may be nested under `data`, which the payload normaliser merges into the top level:

```json
{ "type": "telemetry_history_request", "roomId": "101", "data": { "limit": 10 } }
```

`roomId` must match the MQTT topic, otherwise the request is rejected with `ROOM_MISMATCH`. `limit` defaults to `50` and accepts `1`–`500`. Every request may carry a `requestId`, which is echoed back so several outstanding requests can be told apart. All three requests are answered only to the room that asked, including `telemetry_all_rooms_request`, whose payload spans every room.

Failures use the standard error envelope (`type: "error"`, `success: false`, `code`, `message`, `databaseCode`) with `code` set to one of `INVALID_HISTORY_QUERY`, `HISTORY_QUERY_FAILED`, `INVALID_LATEST_QUERY`, `LATEST_QUERY_FAILED` or `ALL_ROOMS_QUERY_FAILED`.

### `telemetry_history_request` → `telemetry_history_response`

Mirrors `GET /api/v1/telemetry/rooms/:roomId/history`.

```json
{
  "type": "telemetry_history_request",
  "roomId": "101",
  "requestId": "esp32-101-000042",
  "limit": 50,
  "startTime": "2026-09-02T00:00:00Z",
  "endTime": "2026-09-02T23:59:59Z"
}
```

`startTime` and `endTime` must be supplied together; omit both to get the most recent readings. Each accepts ISO 8601 (`2026-09-02T00:00:00Z`), MySQL text (`2026-09-02 00:00:00`) or epoch milliseconds. Timestamps are converted to the server's local time before the query, so an ISO string with a trailing `Z` is matched correctly against the `time` column.

```json
{
  "type": "telemetry_history_response",
  "requestId": "esp32-101-000042",
  "respondedAt": "2026-09-02T12:00:01.000Z",
  "success": true,
  "roomId": "101",
  "total": 1,
  "data": [
    {
      "wendu": 24.5,
      "shidu": 52.3,
      "time": "2026-09-02 12:00:00",
      "timestamp": "2026-09-02 12:00:00"
    }
  ],
  "timeRange": { "start": "2026-09-02 00:00:00", "end": "2026-09-02 23:59:59" },
  "query": { "limit": 50, "startTime": "2026-09-02 00:00:00", "endTime": "2026-09-02 23:59:59" }
}
```

### `telemetry_all_rooms_request` → `telemetry_all_rooms_response`

Mirrors `GET /api/v1/telemetry/rooms`: the newest reading of each configured room, in `ROOM_IDS` order. It takes no parameters.

```json
{ "type": "telemetry_all_rooms_request", "roomId": "101", "requestId": "esp32-101-000043" }
```

```json
{
  "type": "telemetry_all_rooms_response",
  "requestId": "esp32-101-000043",
  "respondedAt": "2026-09-02T12:00:01.000Z",
  "success": true,
  "total": 10,
  "data": [
    { "roomId": "101", "wendu": 24.5, "shidu": 52.3, "time": "2026-09-02 12:00:00" },
    { "roomId": "102", "wendu": 24.2, "shidu": 51.8, "time": "2026-09-02 11:59:00" }
  ]
}
```

`time` is the stored `DATETIME` text (not an ISO string). When a room has no readings or its table is missing, that room is still listed with `wendu: 0`, `shidu: 0` and `time` set to the current timestamp.

### `telemetry_latest_request` → `telemetry_latest_response`

Mirrors `GET /api/v1/telemetry/rooms/:roomId?limit=`: the newest `limit` readings of the requesting room.

```json
{ "type": "telemetry_latest_request", "roomId": "101", "requestId": "esp32-101-000044", "limit": 10 }
```

```json
{
  "type": "telemetry_latest_response",
  "requestId": "esp32-101-000044",
  "respondedAt": "2026-09-02T12:00:01.000Z",
  "success": true,
  "roomId": "101",
  "total": 2,
  "data": [
    { "wendu": 24.2, "shidu": 51.8, "time": "11:59" },
    { "wendu": 24.5, "shidu": 52.3, "time": "12:00" }
  ],
  "query": { "limit": 10 }
}
```

`time` is formatted as `HH:mm`. **`data` is ordered oldest first**, so the most recent reading is `data[data.length - 1]`, not `data[0]`. Keep `limit` small on constrained hardware: a 500-reading response is roughly 40 KB of JSON, which exceeds the default MQTT receive buffer of many ESP32 clients (PubSubClient defaults to 256 bytes, so `MQTT_MAX_PACKET_SIZE` / `setBufferSize` must be raised). Values of `10`–`50` are usually enough.

## Air Conditioner Commands

The management frontend sends a full command to the HTTP API. The API forwards this exact command through the room's MQTT downlink topic and waits up to 10 seconds for a device acknowledgement on the MQTT uplink topic.

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

The accepted response contains the generated `commandId` and `status: "pending"`. The ESP32 must publish this message to the room's MQTT uplink topic:

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
