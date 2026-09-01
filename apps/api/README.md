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
