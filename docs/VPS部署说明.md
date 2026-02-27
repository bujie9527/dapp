# Dapp 项目 VPS 部署说明（Hostinger）

## 一、已完成的云端设置（Hostinger API）

- **防火墙组**：`dapp-vps`（ID: 221701）已创建并**已绑定到当前 VPS**（ID: 1245452）。
- **放行端口**（仅以下入站）：
  - **22**：SSH
  - **80**：HTTP
  - **443**：HTTPS
- 其余入站流量由 Hostinger 控制面默认拒绝，数据库 5432 及应用端口 3000/3001/4000 不直接对公网开放，仅通过本机或反向代理访问。

## 二、服务器环境需求（与当前 Dapp 一致）

| 项目       | 说明 |
|------------|------|
| 系统       | Ubuntu 24.04 LTS（当前 VPS 模板） |
| 运行方式   | Docker Compose（db + api + web + admin） |
| 对外端口   | 建议仅 80/443，由 nginx 反代到内部 3000/3001/4000 |
| 内部端口   | Postgres 5432、API 4000、Web 3000、Admin 3001（不对外暴露） |

## 三、在 VPS 上执行环境准备

1. **SSH 登录**（使用 Hostinger 提供的 root 密码或已配置的 SSH 密钥）：
   ```bash
   ssh root@72.60.104.84
   ```

2. **一键执行准备脚本**（安装 Docker、Docker Compose、UFW，并创建应用目录）：
   ```bash
   curl -sSL https://raw.githubusercontent.com/你的仓库/main/docs/server-setup.sh -o /tmp/server-setup.sh
   chmod +x /tmp/server-setup.sh
   sudo bash /tmp/server-setup.sh
   ```
   若脚本在本地，可先上传再执行：
   ```bash
   scp docs/server-setup.sh root@72.60.104.84:/tmp/
   ssh root@72.60.104.84 'sudo bash /tmp/server-setup.sh'
   ```

3. **脚本会**：
   - 安装 Docker 与 Docker Compose 插件
   - 启用 UFW，仅允许 22/80/443（与 Hostinger 防火墙一致）
   - 创建 `/opt/dapp` 及占位 `.env`，需你编辑填入 `DATABASE_URL`、`SESSION_SECRET`、`CHARGER_PRIVATE_KEY`、`CHARGER_CONTRACT_ADDRESS`、`ADMIN_PASSWORD` 等

## 四、部署应用

1. 将项目代码放到服务器（例如 `/opt/dapp`）：
   ```bash
   cd /opt/dapp
   git clone <你的仓库> .   # 或 rsync/scp 上传
   ```

2. 将 `docs/server-setup.sh` 生成的占位 `.env` 与项目根目录的 `.env` 合并或复制到项目根目录，确保包含所有必填项。

3. 在项目根目录构建并启动（**生产环境**使用 compose 叠加 `docker-compose.prod.yml`，端口仅绑定 127.0.0.1，由宿主机 Nginx 反代）：
   ```bash
   cd /opt/dapp
   docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
   ```

4. 配置 Nginx 反向代理与 TLS（域名 dapp/admin/api.sourcofsun.online）：
   - 复制 `nginx/dapp.sourcofsun.online.conf` 到 `/etc/nginx/sites-available/`，启用站点后 `nginx -t && systemctl reload nginx`。
   - 执行 `certbot --nginx -d dapp.sourcofsun.online -d admin.sourcofsun.online -d api.sourcofsun.online` 申请证书。
   - 密钥与配置清单见 [部署密钥说明](部署密钥说明.md)。

## 五、安全设置小结

| 层级         | 说明 |
|--------------|------|
| Hostinger 防火墙 | 已在控制面创建并激活，仅放行 22/80/443。 |
| UFW（VPS 内）   | 脚本中启用，仅允许 22/80/443，与云端一致。 |
| 应用/数据库     | Postgres 与 API 仅监听 localhost/容器内网，不直接暴露。 |
| 密钥与配置     | `.env` 仅存于服务器，不提交仓库；生产建议 `ALLOW_BASIC_AUTH=false`，使用 session 登录。 |

## 六、修改防火墙（Hostinger）

- 查看防火墙列表：调用 `GET /api/vps/v1/firewall`。
- 查看规则：`GET /api/vps/v1/firewall/221701`。
- 新增规则：`POST /api/vps/v1/firewall/221701/rules`，body 示例：`{"protocol":"TCP","port":"80","source":"any","source_detail":"0.0.0.0/0"}`。
- 解绑/停用：`POST /api/vps/v1/firewall/221701/deactivate/1245452`。

当前 VPS 公网 IP：**72.60.104.84**（srv1245452.hstgr.cloud）。

## 七、通过 Hostinger API / MCP 部署

若已配置 [Hostinger MCP](Hostinger%20MCP.txt) 或持有 Hostinger API 令牌，可直接通过 API 在该 VPS 上创建/更新 Docker 项目，无需 SSH。详见 [Hostinger-API部署说明](Hostinger-API部署说明.md)；接口定义见 [api-1.yaml](api-1.yaml)。
