# Initel Club 智能仓储管理系统

项目由 Vue 3 + Vite 前端和 NestJS API 组成，提供仓储温湿度监测、库存出入库、用户认证和 Moonshot 兼容的 AI 助手功能。

## 移植后的配置清单

目标机器需要安装：

- Node.js 20 或更高版本（建议使用当前 LTS）与 npm
- MySQL 8.0 或兼容的 MySQL 服务
- 生产环境建议使用 Nginx/Caddy 托管前端并反向代理 API；仅内网测试可直接运行 Node 服务

将整个项目目录（不含 `node_modules`、`dist` 和本地 `.env`）复制到目标机器后，在项目根目录执行：

```powershell
npm.cmd ci
npm.cmd ci --prefix apps/api
Copy-Item .env.example .env
```

Linux/macOS 上将上述命令中的 `npm.cmd` 换成 `npm`，复制环境文件可使用 `cp .env.example .env`。

然后编辑根目录 `.env`。不要提交该文件，也不要把真实的密码、JWT 密钥或 AI 密钥写进前端代码。

```dotenv
# MySQL：必须可从 API 所在机器访问
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=initel_app
DB_PASSWORD=replace-with-a-strong-password
DB_NAME=initel_club
DB_CONNECTION_LIMIT=10

# API 监听端口及允许访问 API 的前端地址
PORT=15010
CORS_ORIGIN=https://your-domain.example

# 前端请求地址：同域反向代理时保持相对路径；前后端分域时填 API 完整地址
VITE_API_BASE_URL=/api/v1

# 认证：使用足够长的随机值，迁移时更换会使现有登录令牌失效
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=8h

# 可选：配置后才可使用 AI 对话和报告功能
MOONSHOT_API_KEY=replace-with-your-api-key
MOONSHOT_BASE_URL=https://api.moonshot.cn/v1
MOONSHOT_MODEL=moonshot-v1-8k
```

`DB_HOST`、`DB_USER`、`DB_PASSWORD`、`DB_NAME` 和 `JWT_SECRET` 是后端启动所必需的配置；`MOONSHOT_API_KEY` 虽可不填写，但 AI 接口将返回“未配置”的服务错误。`VITE_` 前缀变量会在前端构建时写入产物，因此改变它后必须重新执行前端构建。

## 数据库迁移

先创建目标数据库并导入源库数据。认证所需的 `users` 表脚本位于 [001_create_users.sql](apps/api/database/migrations/001_create_users.sql)：

```powershell
mysql -h <DB_HOST> -P <DB_PORT> -u <DB_USER> -p <DB_NAME> < apps/api/database/migrations/001_create_users.sql
```

除 `users` 外，系统还依赖下列**已有业务表及数据**；仓库没有提供它们的建表/初始化脚本，因此移植时必须从原 MySQL 实例导出并导入，或按同等字段自行创建：

| 用途 | 必需表 |
| --- | --- |
| 温湿度监测 | `101`、`102`、`108`、`109`、`113`、`115`、`116`、`117`、`118`、`119`（字段：`wendu`、`shidu`、`time`） |
| 各房间库存 | `data101`、`data102`、`data108`、`data109`、`data113`、`data115`、`data116`、`data117`、`data118`、`data119`（至少包含 `id`、`home`、`name`、`number`、`price`、`unity`、`content`、`time`） |

建议在原服务器导出时同时保留表结构和数据，例如：`mysqldump -h <source-host> -u <source-user> -p <source-db> > initel.sql`，再在目标服务器执行 `mysql -u <target-user> -p <target-db> < initel.sql`。生产迁移前请先完成备份，并以测试库验证导入结果。

## 开发与验证

```powershell
# 同时启动前端（15011）和 API（15010）
npm.cmd run dev:full

# 分别构建前端和 API
npm.cmd run build
npm.cmd run build:api
```

浏览器访问 `http://localhost:15011`；API 健康检查为 `http://localhost:15010/api/v1/health`，Swagger 为 `http://localhost:15010/api/docs`。开发服务器已将 `/api` 代理到 `http://localhost:15010`。

## 生产部署建议

1. 在目标主机完成环境变量和数据库配置，执行 `npm ci`、`npm ci --prefix apps/api`、`npm run build`、`npm run build:api`。
2. 以进程守护工具运行 API：`npm --prefix apps/api run start`。其构建产物为 `apps/api/dist/main.js`，监听 `.env` 中的 `PORT`。
3. 将根目录 `dist/` 作为静态站点目录；让 Web 服务器把 `/api/` 代理至 `http://127.0.0.1:15010/api/`。此前端配置使用 `/api/v1`，同域代理时不需要改动 `VITE_API_BASE_URL`。
4. 如前端和 API 使用不同域名，构建前将 `VITE_API_BASE_URL` 改为例如 `https://api.example.com/api/v1`，并把 `CORS_ORIGIN` 设为前端实际来源（例如 `https://app.example.com`），然后重新构建前端。
5. 发布后检查健康接口、登录/注册、房间温湿度、库存读写和 AI（若已配置）功能。API 健康接口能确认数据库连通性。

### Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name your-domain.example;
    root /srv/initel-club/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:15010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

启用 HTTPS 时，请将 `CORS_ORIGIN` 写为带 `https://` 的最终前端地址。对于多来源，后端支持用英文逗号分隔多个来源。

## 常见启动问题

如果以 `npm run dev:full` 启动时，后端报错 `Cannot read properties of undefined`（例如读取 `getOrThrow` 或 `login`），请拉取包含显式 Nest 依赖注入修复的最新代码后重新启动。该问题源于开发脚本使用的 `tsx` 不会可靠地产生 Nest 所需的构造函数类型元数据；生产构建虽可能正常，开发模式会把服务依赖注入为 `undefined`，继而使对应 API 失败或使前端出现 `/api` 的 `ECONNREFUSED`。

`npm warn Unknown global config "--init.module"` 是服务器上旧版 npm 配置带来的弃用警告，不是 API 无法启动的原因。可使用 `npm config delete init.module --location=global` 清理；若仍出现，请检查并删除用户目录 `~/.npmrc` 中的 `init.module` 或 `--init.module` 项，然后重新打开终端。
## Linux One-Click Setup

After uploading the project to a Linux server, run:

```bash
chmod +x scripts/setup-server.sh
./scripts/setup-server.sh
```

The script interactively creates `.env`, installs dependencies, builds the frontend and API, and applies the `users` and `operation_logs` migrations. To also install and start an API systemd service, run:

```bash
./scripts/setup-server.sh --install-service
```

Use `FORCE_ENV=true ./scripts/setup-server.sh` to regenerate `.env`.
