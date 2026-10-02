#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
INSTALL_SERVICE=false
[[ "${1:-}" == "--install-service" ]] && INSTALL_SERVICE=true

fail() { printf '\nERROR: %s\n' "$1" >&2; exit 1; }
info() { printf '\n==> %s\n' "$1"; }
ask() { local value; read -r -p "$1 [$2]: " value; printf '%s' "${value:-$2}"; }
ask_secret() { local value; read -r -s -p "$1: " value; printf '\n' >&2; printf '%s' "$value"; }

command -v node >/dev/null 2>&1 || fail 'Node.js 20 or newer is required.'
command -v npm >/dev/null 2>&1 || fail 'npm is required.'
NODE_BIN="$(command -v node)"
[[ "$(node -p "process.versions.node.split('.')[0]")" -ge 20 ]] || fail 'Node.js 20 or newer is required.'
cd "$PROJECT_DIR"

if [[ ! -f "$ENV_FILE" ]] || [[ "${FORCE_ENV:-false}" == "true" ]]; then
  info 'Creating backend environment configuration'
  DB_HOST="$(ask 'MySQL host' '127.0.0.1')"
  DB_PORT="$(ask 'MySQL port' '3306')"
  DB_USER="$(ask 'MySQL user' 'initel_app')"
  DB_PASSWORD="$(ask_secret 'MySQL password')"
  DB_NAME="$(ask 'MySQL database name' 'initel_club')"
  PORT="$(ask 'API port' '15010')"
  CORS_ORIGIN="$(ask 'Frontend origin' 'http://localhost')"
  DEEPSEEK_API_KEY="$(ask_secret 'DeepSeek API key (leave empty to disable AI)')"
  MQTT_URL="$(ask 'MQTT broker URL' 'mqtt://127.0.0.1:1883')"
  MQTT_USERNAME="$(ask 'MQTT username (leave empty if not required)' '')"
  MQTT_PASSWORD="$(ask_secret 'MQTT password (leave empty if not required)')"
  JWT_SECRET="$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  cat > "$ENV_FILE" <<EOF
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_CONNECTION_LIMIT=10
PORT=$PORT
CORS_ORIGIN=$CORS_ORIGIN
VITE_API_BASE_URL=/api/v1
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=8h
DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
MQTT_URL=$MQTT_URL
MQTT_USERNAME=$MQTT_USERNAME
MQTT_PASSWORD=$MQTT_PASSWORD
MQTT_CLIENT_ID=initel-api
MQTT_UP_TOPIC=initel/devices/+/up
MQTT_DOWN_TOPIC=initel/devices/{roomId}/down
MQTT_DEVICE_TTL_MS=90000
MQTT_RECONNECT_PERIOD_MS=5000
MQTT_CONNECT_TIMEOUT_MS=10000
EOF
  chmod 600 "$ENV_FILE"
else
  info 'Using existing .env configuration (set FORCE_ENV=true to regenerate it)'
fi

info 'Installing frontend dependencies'
npm ci
# Projects copied from Windows can lose the executable bit on esbuild's
# platform binary. Repair it before Vite or the production build invokes it.
find "$PROJECT_DIR/node_modules/@esbuild" -type f -path '*/bin/esbuild' -exec chmod +x {} + 2>/dev/null || true
"$PROJECT_DIR/node_modules/.bin/esbuild" --version >/dev/null 2>&1 || fail 'esbuild is not executable. Remove node_modules and rerun this setup script.'
info 'Installing API dependencies'
npm ci --prefix apps/api
info 'Building frontend and API'
# Keep type-check and Vite in separate processes on small servers. Running the
# root `build` script uses run-p and can make both memory-heavy jobs overlap.
npm run type-check
npm run build-only
npm run build:api

info 'Applying database migrations'
(
  cd "$PROJECT_DIR/apps/api"
  node - "$PROJECT_DIR" <<'NODE'
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const root = process.argv[2];
const values = Object.fromEntries(fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
(async () => {
  const connection = await mysql.createConnection({ host: values.DB_HOST, port: Number(values.DB_PORT || 3306), user: values.DB_USER, password: values.DB_PASSWORD, database: values.DB_NAME, multipleStatements: true });
  for (const file of ['001_create_users.sql', '002_create_operation_logs.sql', '003_create_telemetry_tables.sql']) {
    await connection.query(fs.readFileSync(path.join(root, 'apps/api/database/migrations', file), 'utf8'));
    console.log(`Applied ${file}`);
  }
  await connection.end();
})().catch((error) => { console.error(error.message); process.exit(1); });
NODE
)

if $INSTALL_SERVICE; then
  info 'Installing systemd API service'
  sudo tee /etc/systemd/system/initel-club-api.service >/dev/null <<EOF
[Unit]
Description=Initel Club API
After=network.target
[Service]
Type=simple
WorkingDirectory=$PROJECT_DIR
EnvironmentFile=$ENV_FILE
ExecStart=$NODE_BIN $PROJECT_DIR/apps/api/dist/main.js
Restart=always
RestartSec=5
User=$(id -un)
Group=$(id -gn)
[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable --now initel-club-api
fi

PORT="$(grep '^PORT=' "$ENV_FILE" | cut -d= -f2)"
info 'Checking API health endpoint'
if command -v curl >/dev/null 2>&1 && curl --fail --silent "http://127.0.0.1:$PORT/api/v1/health" >/dev/null; then
  echo 'API health check passed.'
else
  echo 'Build and migration completed. Start the API with: npm --prefix apps/api run start'
fi
echo 'Setup complete.'
echo "Frontend build: $PROJECT_DIR/dist"
