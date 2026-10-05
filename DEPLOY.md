# Initel Club 云端部署指南

适用于「2 核 2G Linux 服务器 + 同源 Nginx」的部署方式。

---

## 架构

```
浏览器
  │  http://<服务器IP>/
  ▼
Nginx (80)
  ├─ /            → 静态文件  /srv/initel-club/dist   (前端产物)
  └─ /api/        → 反向代理  127.0.0.1:15010         (NestJS API)
                                     │
                                     ├─ MySQL   8.148.187.51:3306
                                     └─ MQTT    8.148.187.51:1883
```

**为什么选同源部署**：前端产物里烘焙的是相对路径 `baseURL: "/api/v1"`（已核实
`dist/assets/index-*.js`）。让 Nginx 同时托管静态文件并反代 `/api/`，浏览器看到的
就是同源请求，**完全不涉及跨域**，也不需要改前端、不需要重新构建。

**核心原则：服务器上不编译。** 2G 内存跑 `vue-tsc` 会被 OOM Killer 杀掉。前端在
本机构建好，只把产物传上去；后端在服务器上只装运行时依赖，不装 typescript/vite。

---

## 系统差异（先看这里）

下面的命令主体按 **Debian/Ubuntu** 写。阿里云 ECS 的默认镜像是
**Alibaba Cloud Linux / CentOS**（RHEL 系），包管理器和 Nginx 配置位置都不同。先确认：

```bash
cat /etc/os-release | head -3
```

| 用途 | Debian / Ubuntu | Alibaba Cloud Linux / CentOS（RHEL 系） |
| --- | --- | --- |
| 装包 | `sudo apt install -y nginx` | `sudo dnf install -y nginx`（旧版用 `yum`） |
| 防火墙 | `ufw` | `firewall-cmd` |
| Nginx 站点配置 | `/etc/nginx/sites-available/` + `sites-enabled/` | `/etc/nginx/conf.d/*.conf`（**没有** sites-available） |
| Nginx 运行用户 | `www-data` | `nginx` |
| 装 Node | `curl -fsSL https://deb.nodesource.com/setup_22.x \| sudo -E bash -` | `curl -fsSL https://rpm.nodesource.com/setup_22.x \| sudo bash -` |

**RHEL 系的第 6 步（Nginx）换成：**

```bash
sudo dnf install -y nginx
sudo cp /srv/initel-club/deploy/nginx-initel-club.conf /etc/nginx/conf.d/initel-club.conf
sudo nano /etc/nginx/conf.d/initel-club.conf
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

**RHEL 系的第 7 步（防火墙）换成：**

```bash
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

### ⚠️ 绝对不要把项目放在 `/root` 下

`/root` 的默认权限是 `dr-xr-x---`，只有 root 能进入。Nginx 以 `nginx`（RHEL）或
`www-data`（Debian）身份运行，**读不到 `/root` 下的任何文件**，症状是访问首页返回
**403 Forbidden**，而且日志里的原因很容易被忽略。

所以项目要放在 `/srv/` 或 `/var/www/` 下：

```bash
sudo mkdir -p /srv
sudo mv /root/Initel_club /srv/initel-club
sudo chmod a+rX /srv/initel-club              # 让 nginx 能进入项目目录
sudo chmod -R a+rX /srv/initel-club/dist      # 让 nginx 能读静态文件
```

---

## 第 0 步：先改 4 处配置（重要）

这些必须在部署前处理，否则要么跑不起来，要么有安全风险。

| 项 | 现在的问题 | 要改成 |
| --- | --- | --- |
| `JWT_SECRET` | 仍是占位符 `replace-with-a-long-random-secret`，**等于登录体系没有密钥，任何人都能伪造 token 绕过登录** | `openssl rand -hex 32` 的输出 |
| `MQTT_USERNAME` / `MQTT_PASSWORD` | `user` / `root`，且 broker 在**公网**，任何人都能伪造传感器数据入库、或给房间下发空调指令 | 强口令（同时要在 broker 上改） |
| `MQTT_CLIENT_ID` | `initel-api-local`，是本机开发用的后缀 | 改成 `initel-api`，避免与本地开发进程互相踢下线 |
| `CORS_ORIGIN` | `http://localhost:15011` | 改成实际访问地址，如 `http://8.148.187.51` |

另外建议把 `DB_CONNECTION_LIMIT` 从 `10` 降到 `5` —— 每个连接在 MySQL 端和 API 端
都占内存，2G 机器上没必要留 10 个。

---

## 第 1 步：本机打包（Windows）

**只为部署挑选必要文件**，用暂存目录的方式，从根上排除 `node_modules`。

```powershell
$src   = 'C:\Users\小新\Desktop\毕业设计\Initel_club'
$stage = Join-Path $env:LOCALAPPDATA 'initel-stage'
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $stage | Out-Null

# 后端：编译产物 + 依赖清单 + 数据库迁移
New-Item -ItemType Directory -Force -Path "$stage\apps\api" | Out-Null
Copy-Item "$src\apps\api\dist"              -Destination "$stage\apps\api\dist"   -Recurse -Force
Copy-Item "$src\apps\api\database"          -Destination "$stage\apps\api\database" -Recurse -Force
Copy-Item "$src\apps\api\package.json"      -Destination "$stage\apps\api\" -Force
Copy-Item "$src\apps\api\package-lock.json" -Destination "$stage\apps\api\" -Force

# 前端：构建产物（就是刚构建好的 dist）
Copy-Item "$src\dist" -Destination "$stage\dist" -Recurse -Force

# 部署配置与运维脚本
Copy-Item "$src\deploy"  -Destination "$stage\deploy"  -Recurse -Force
Copy-Item "$src\scripts" -Destination "$stage\scripts" -Recurse -Force
Copy-Item "$src\README.md"    -Destination "$stage\" -Force
Copy-Item "$src\.env.example" -Destination "$stage\" -Force

# 打成压缩包（放在项目上一级，避免被打进下次的包）
Compress-Archive -Path "$stage\*" -DestinationPath "$src\..\initel-deploy.zip" -Force
"生成完成：$((Resolve-Path "$src\..\initel-deploy.zip").Path)"
```

### ⚠️ 关于 `node_modules`

**`node_modules` 绝对不能上传**，原因：

- `esbuild` 和 `bcrypt` 都是**平台相关的原生二进制**。Windows 版传到 Linux 上会报
  `The service is no longer running` 或 bcrypt 加载失败。
- 你这台机器上有**三套** `node_modules`（根目录、`apps/api`、`src`），体积很大。

上面的打包命令从设计上就不会包含它们。

### 关于 `.env`

**故意没有打进压缩包** —— 它含真实数据库密码和 API 密钥，不该跟着部署包到处走。
在第 3 步于服务器上单独创建。

### 上传

```powershell
scp "$src\..\initel-deploy.zip" root@8.148.187.51:/tmp/
```

---

## 第 2 步：服务器上准备目录并解压

```bash
# 装 Node 22 LTS（如果还没有）
node -v || (curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs)

sudo mkdir -p /srv/initel-club
sudo chown -R "$USER":"$USER" /srv/initel-club
cd /srv/initel-club
unzip -o /tmp/initel-deploy.zip
ls          # 应该看到 dist/  apps/  deploy/  README.md  .env.example
```

---

## 第 3 步：创建 `.env`

```bash
cd /srv/initel-club
cp .env.example .env
# 生成一个真正的 JWT 密钥
echo "JWT_SECRET=$(openssl rand -hex 32)"
nano .env
```

填成下面这样（`<>` 处换成你的真实值）：

```dotenv
DB_HOST=8.148.187.51
DB_PORT=3306
DB_USER=usr
DB_PASSWORD=<真实数据库密码>
DB_NAME=usr
DB_CONNECTION_LIMIT=5

PORT=15010
CORS_ORIGIN=http://8.148.187.51
VITE_API_BASE_URL=/api/v1

JWT_SECRET=<上一步生成的随机值>
JWT_EXPIRES_IN=8h

DEEPSEEK_API_KEY=<轮换后的新密钥>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-flash

MQTT_URL=mqtt://8.148.187.51:1883
MQTT_USERNAME=<强口令>
MQTT_PASSWORD=<强口令>
MQTT_CLIENT_ID=initel-api
MQTT_UP_TOPIC=initel/devices/+/up
MQTT_DOWN_TOPIC=initel/devices/{roomId}/down
MQTT_DEVICE_TTL_MS=90000

MOTION_LOG_COOLDOWN_MS=30000
```

```bash
chmod 600 .env      # 只有属主可读
```

> `CORS_ORIGIN` 在同源部署下其实不会被触发（浏览器不检查同源请求），但填对更稳妥 ——
> 将来如果前端换到别的域名，这里就是必须改的地方。

---

## 第 4 步：装 API 运行时依赖（不装前端依赖）

前端在服务器上**一个 npm 包都不需要** —— `dist/` 已经是纯静态文件了。

```bash
cd /srv/initel-club
npm ci --prefix apps/api --omit=dev
```

`--omit=dev` 会跳过 `typescript`、`tsx` 这些只在编译时用的包，省磁盘也省内存。

**先试跑一下**，确认能起来再交给 systemd：

```bash
node apps/api/dist/main.js
```

看到这行就成功了：

```
[Bootstrap] API listening on http://localhost:15010/api/v1
```

按 `Ctrl+C` 停掉，然后验证健康接口：

```bash
curl -s http://127.0.0.1:15010/api/v1/health
# 期望：{"status":"ok","database":"connected",...}
```

如果报 `Missing required environment variable: DB_HOST`，说明 `.env` 没被读到 ——
检查它在 `/srv/initel-club/.env`（不是 `apps/api/.env`）。

---

## 第 5 步：用 systemd 托管 API

```bash
sudo cp /srv/initel-club/deploy/initel-club-api.service /etc/systemd/system/
sudo nano /etc/systemd/system/initel-club-api.service   # 改 WorkingDirectory / User / ExecStart
```

**关键**：`User=` 必须与 `.env` 的属主一致（`.env` 是 `chmod 600`），否则服务读不到
配置，表现就是启动即报 `DB_HOST` 缺失。先确认属主：

```bash
ls -l /srv/initel-club/.env      # 第三列就是属主
command -v node                  # 填进 ExecStart
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now initel-club-api
systemctl status initel-club-api --no-pager
journalctl -u initel-club-api -f      # 实时看日志，Ctrl+C 退出
```

> 这个 unit **故意没有写 `EnvironmentFile`**。应用自己用 dotenv 读同目录的 `.env`
> （已经验证可用），而 systemd 的 `EnvironmentFile` 语法比 dotenv 严格，这份 `.env`
> 里又有大量中文注释，交给它解析反而多一处失败点。

---

## 第 6 步：Nginx

```bash
sudo apt install -y nginx
sudo cp /srv/initel-club/deploy/nginx-initel-club.conf /etc/nginx/sites-available/initel-club
sudo ln -sf /etc/nginx/sites-available/initel-club /etc/nginx/sites-enabled/initel-club
sudo rm -f /etc/nginx/sites-enabled/default
sudo nano /etc/nginx/sites-available/initel-club    # 确认 root 指向 /srv/initel-club/dist
sudo nginx -t
sudo systemctl reload nginx
```

**两个最容易配错的地方**（配置文件里都有注释说明）：

1. `try_files $uri $uri/ /index.html;` —— 项目路由用的是 history 模式，**少了这行，
   刷新 `/home/data2` 这类子路径就会 404**。
2. `proxy_pass http://127.0.0.1:15010;` —— **结尾不能加斜杠**。加了会把
   `/api/v1/health` 改写成 `/v1/health`，后端直接 404。

---

## 第 7 步：安全组 / 防火墙

| 端口 | 处置 |
| --- | --- |
| `80`（或 `443`） | **开放**，供浏览器访问 |
| `15010` | **关闭**。API 只应由 Nginx 从 127.0.0.1 访问，暴露到公网等于绕过 Nginx 裸奔 |
| `3306` MySQL | **关闭**。你的 `DB_HOST` 是公网 IP，如果 3306 对全网开放，任何人都能爆破数据库 |
| `1883` MQTT | **限制来源**，只允许本机/已知设备 IP。当前是 `user`/`root` 弱口令 + 公网，风险最高 |

```bash
# Ubuntu 上用 ufw 的示例
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 15010/tcp
sudo ufw deny 3306/tcp
sudo ufw status
```

> 云厂商的安全组是**独立于**服务器防火墙的另一层，两处都要改。

---

## 第 8 步：验证清单

按顺序过一遍，哪一步断了就只排查那一步。

```bash
# 1. API 直连（绕开 Nginx）
curl -s http://127.0.0.1:15010/api/v1/health

# 2. 经 Nginx 访问 API
curl -s http://127.0.0.1/api/v1/health

# 3. 前端首页
curl -sI http://127.0.0.1/ | head -1          # 期望 HTTP/1.1 200 OK

# 4. SPA 子路由回退（验证 try_files 配对了）
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/home/data2   # 期望 200，不是 404

# 5. 静态资源
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/assets/index-*.js
```

浏览器端：

- [ ] 打开 `http://8.148.187.51/` → 出现登录页
- [ ] 登录成功 → 进入工作台
- [ ] **在 `/home/data2` 按 F5 刷新** → 仍然正常（验证 history 回退）
- [ ] 实时数据展示有数字（验证 API + 数据库）
- [ ] 操作日志能列出记录（验证 `operation_logs` 表）
- [ ] AI 助手能返回回复（验证 DeepSeek 配置）
- [ ] 出入库 Excel 导入能用（验证批量入库接口）
- [ ] 空调控制下发后，设备有反应（验证 MQTT）

---

## 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 页面能开但所有接口 500/失败 | Nginx 反代路径不对 | 确认 `proxy_pass` 结尾**没有**斜杠 |
| 首页正常，刷新子路由 404 | 少了 SPA 回退 | 检查 `try_files ... /index.html` |
| 接口 502 Bad Gateway | API 没起来 | `systemctl status initel-club-api`；`journalctl -u initel-club-api -n 50` |
| 启动报 `Missing required environment variable: DB_HOST` | `.env` 位置不对或属主不可读 | 必须在 `/srv/initel-club/.env`，且 `User=` 与属主一致 |
| 登录成功但刷新后要重新登录 | 前端已知问题（路由守卫被注释、登录态未持久化恢复） | 不是部署问题，见 README 的说明 |
| 硬件数据不上来 | MQTT 未连上 | `curl -s http://127.0.0.1:15010/api/v1/sensors/health` 看 `mqtt.connected` 与 `lastError` |
| AI 报错 | 模型名或密钥 | `curl -s https://api.deepseek.com/models -H "Authorization: Bearer $DEEPSEEK_API_KEY"` 核对模型 ID |
| 构建时 `exited with 137` | 在服务器上编译导致 OOM | 不要在本机（服务器）构建，改在本机构建后上传产物 |

---

## 后续更新代码时

改了**前端**：

```powershell
# 本机
npm.cmd run build
# 只需重传 dist/
scp -r dist root@8.148.187.51:/srv/initel-club/
```

改了**后端**：

```powershell
# 本机
npm.cmd run build:api
scp -r apps/api/dist root@8.148.187.51:/srv/initel-club/apps/api/
# 服务器
sudo systemctl restart initel-club-api
```

改了 **`.env`**：只需重启 API，**不需要重新构建**：

```bash
sudo systemctl restart initel-club-api
```

> 注意：`VITE_` 开头的变量是在**构建时**写进产物的，改了对已构建的 `dist/` 无效，
> 必须重新 `npm run build` 并重传 `dist/`。
