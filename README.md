# EVM (Base) 最小化 dApp 授权系统

用户端：一个页面完成 **SIWE 登录** + **USDT Approve** 给 Charger 合约；管理员后台：查看授权日志、用户列表、配置编辑、对已 approve 地址发起扣费（后端 signer 调用 Charger.charge）。

## 目录结构

```
├── apps/
│   ├── api/          # 后端 API（Express）
│   ├── admin/        # 管理员后台（Next.js）
│   └── web/          # 用户端（Next.js + wagmi v2 + WalletConnect）
├── packages/
│   ├── core/         # 共享类型与 SIWE 工具
│   └── db/           # Prisma schema 与 client
├── contracts/        # Solidity Charger.sol
├── docker-compose.yml
└── Dockerfile(s)     # apps/api, apps/web, apps/admin
```

## 技术栈

- **Monorepo**: pnpm workspace
- **前端**: Next.js (App Router) + TypeScript
- **钱包**: WalletConnect + wagmi v2 + viem
- **SIWE**: nonce + verify，cookie session
- **DB**: Postgres + Prisma
- **合约**: Charger.sol（onlyOwner 调用 charge）

## 安全与配置

- **高敏密钥**（`CHARGER_PRIVATE_KEY`、`DATABASE_URL`、`SESSION_SECRET`）仅通过环境变量/ secret 注入，不做后台录入。
- **业务配置**（如 `PUBLIC_BASE_URL`、`BASE_RPC_URL`、`USDT_ADDRESS`、`CHARGER_CONTRACT_ADDRESS`、`DEFAULT_APPROVE_AMOUNT`、`MAX_SINGLE_CHARGE_AMOUNT`、`CONFIRMATIONS_REQUIRED`）存 DB `settings` 表，在 admin 后台可视化编辑，并写审计日志。
- **events** 表记录 SIWE / APPROVE / CHARGE，状态 SUCCESS | REJECTED | FAILED，含错误摘要。

## 本地开发

1. 安装依赖：`pnpm install`
2. 复制 `.env.example` 为 `.env` 并填写（至少 `DATABASE_URL`）
3. 生成 Prisma client 并推库：`pnpm db:generate`，`pnpm db:push`
4. 启动 API：`pnpm --filter @dapp/api dev`
5. 启动 Web：`pnpm --filter @dapp/web dev`
6. 启动 Admin：`pnpm --filter @dapp/admin dev`

API: http://localhost:4000  
Web: http://localhost:3000  
Admin: http://localhost:3001（登录用 `ADMIN_USER` / `ADMIN_PASSWORD`）

## Docker 本地运行

```bash
# 需先有 pnpm-lock.yaml：pnpm install
docker compose up --build
```

**Windows 若出现** `header key "x-docker-expose-session-sharedkey" contains value with non-printable ASCII characters`：先关闭 BuildKit 再构建：

```powershell
$env:DOCKER_BUILDKIT=0
docker compose up --build
```

- db: 5432  
- api: 4000  
- web: 3000  
- admin: 3001  

反向代理占位已在 `docker-compose.yml` 中注释，可后续加 nginx + TLS。

## API 路由摘要

| 路径 | 说明 |
|------|------|
| GET /siwe/nonce | 获取 SIWE nonce |
| POST /siwe/verify | 验证 SIWE 签名，写 session |
| GET /siwe/me | 当前 session 地址 |
| GET /settings | 获取配置（可公开或限权） |
| PUT /settings | 更新配置（admin Basic Auth） |
| GET /events | 事件列表（admin） |
| POST /events | 上报事件（需 SIWE session，如 APPROVE） |
| GET /users | 用户列表（admin） |
| POST /charge | 发起扣费（admin） |
| GET /charge/status?chargeId= | 扣费状态（admin） |

## 合约

- `contracts/contracts/Charger.sol`：从已 approve 的地址扣 USDT 到 owner；仅 owner 可调用 `charge(address, amount, ref)`。
- 部署后设置 `CHARGER_CONTRACT_ADDRESS` 与 `CHARGER_PRIVATE_KEY`（owner 私钥）。
