# Initel Club API

NestJS modular backend for telemetry, inventory, authentication and AI features.

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
- `ai`: Moonshot-compatible chat and report endpoints
- `health`: service and database health check
