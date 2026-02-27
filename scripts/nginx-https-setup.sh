#!/bin/bash
# 在 VPS 上配置 Nginx 反向代理 + Let's Encrypt HTTPS
# 用法：ssh root@72.60.104.84 后执行：
#   curl -sSL https://raw.githubusercontent.com/bujie9527/dapp/main/scripts/nginx-https-setup.sh -o /tmp/nginx-https-setup.sh
#   chmod +x /tmp/nginx-https-setup.sh
#   sudo /tmp/nginx-https-setup.sh YOUR_EMAIL@example.com
# 或将脚本 scp 到服务器后执行，需传入申请证书用的邮箱（用于 Let's Encrypt 通知）

set -e
CERTBOT_EMAIL="${1:-}"
if [ -z "$CERTBOT_EMAIL" ]; then
  echo "用法: $0 YOUR_EMAIL@example.com"
  echo "  邮箱用于 Let's Encrypt 证书到期等通知"
  exit 1
fi

echo "[1/6] 更新并安装 nginx、certbot..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

echo "[2/6] 创建 certbot 验证目录..."
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot

echo "[3/6] 下载 Nginx 配置..."
curl -sSL "https://raw.githubusercontent.com/bujie9527/dapp/main/nginx/dapp.sourcofsun.online.conf" -o /etc/nginx/sites-available/dapp.sourcofsun.online.conf

echo "[4/6] 启用站点并禁用默认站点..."
ln -sf /etc/nginx/sites-available/dapp.sourcofsun.online.conf /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

echo "[5/6] 检查配置并重载 Nginx..."
nginx -t && systemctl reload nginx
systemctl enable --now nginx

echo "[6/6] 申请 HTTPS 证书..."
certbot --nginx -d dapp.sourcofsun.online -d admin.sourcofsun.online -d api.sourcofsun.online \
  --non-interactive --agree-tos --email "$CERTBOT_EMAIL"

echo ""
echo "=== 完成 ==="
echo "  - https://dapp.sourcofsun.online   (用户端)"
echo "  - https://admin.sourcofsun.online  (管理后台)"
echo "  - https://api.sourcofsun.online    (API)"
