#!/bin/bash
# Dapp 项目 VPS 环境准备脚本（Ubuntu 24.04）
# 在 Hostinger VPS 上以 root 或 sudo 执行一次即可
# 使用方式：curl -sSL <url> | bash  或  scp 到服务器后 chmod +x server-setup.sh && ./server-setup.sh

set -e

echo "[1/5] 更新系统并安装依赖..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg unzip acl

echo "[2/5] 安装 Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME:-jammy}") stable" > /etc/apt/sources.list.d/docker.list
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "[3/5] 启用 Docker 并加入当前用户..."
systemctl enable --now docker
if [ -n "$SUDO_USER" ]; then
  usermod -aG docker "$SUDO_USER"
  echo "已将用户 $SUDO_USER 加入 docker 组。"
fi

echo "[4/5] 配置 UFW（仅放行 22/80/443，与 Hostinger 防火墙一致）..."
apt-get install -y -qq ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp  comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
# 若需从本机直接访问应用端口（不推荐生产）：ufw allow 3000/tcp && ufw allow 3001/tcp && ufw allow 4000/tcp
ufw --force enable || true
ufw status numbered

echo "[5/5] 创建应用目录与占位 .env..."
APP_DIR="${APP_DIR:-/opt/dapp}"
mkdir -p "$APP_DIR"
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" << 'ENVEOF'
# 复制到 /opt/dapp/.env 后按实际填写
# 必填
DATABASE_URL=postgresql://dapp:dapp@db:5432/dapp
SESSION_SECRET=请替换为随机长字符串
CHARGER_PRIVATE_KEY=0x...
CHARGER_CONTRACT_ADDRESS=0x...

# Admin 登录（与 docker-compose db 环境一致时可与下方一致）
ADMIN_USER=admin
ADMIN_PASSWORD=请设置强密码
# 生产建议关闭 Basic Auth，仅用 session
ALLOW_BASIC_AUTH=false

# 可选
BASE_RPC_URL=https://mainnet.base.org
COOKIE_SECURE=true

# 前端用（docker-compose 中由 build-arg 或 env 传入）
# NEXT_PUBLIC_API_URL=https://你的域名或IP/api
# NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
# NEXT_PUBLIC_USDT_ADDRESS=
# NEXT_PUBLIC_CHARGER_CONTRACT_ADDRESS=
# NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
ENVEOF
  chmod 600 "$APP_DIR/.env"
  echo "已创建占位 $APP_DIR/.env，请编辑后填入真实配置。"
else
  echo "已存在 $APP_DIR/.env，未覆盖。"
fi

echo ""
echo "=== 环境准备完成 ==="
echo "  - Docker: $(docker --version)"
echo "  - Docker Compose: $(docker compose version 2>/dev/null || echo 'plugin not found')"
echo "  - 应用目录: $APP_DIR"
echo "  - 防火墙: UFW 已启用，仅允许 22/80/443"
echo ""
echo "下一步：将项目部署到 $APP_DIR（git clone 或 rsync），复制 docker-compose.yml 与 .env，执行："
echo "  cd $APP_DIR && docker compose up -d --build"
echo "若需对外用 80/443，请在 $APP_DIR 配置 nginx 反向代理（或启用 docker-compose 中的 proxy 服务）。"
