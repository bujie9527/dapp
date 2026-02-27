# multi-stage: build
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile || pnpm install
COPY packages/db packages/db
COPY packages/core packages/core
COPY apps/api apps/api
COPY tsconfig.base.json ./
RUN pnpm --filter @dapp/db exec prisma generate
RUN pnpm --filter @dapp/core build
RUN pnpm --filter @dapp/db build
RUN pnpm --filter @dapp/api build

# run
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/db/package.json /app/packages/db/
COPY --from=builder /app/packages/db/prisma /app/packages/db/prisma
COPY --from=builder /app/packages/core/package.json /app/packages/core/
COPY --from=builder /app/apps/api/package.json /app/apps/api/
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod
COPY --from=builder /app/packages/db/dist /app/packages/db/dist
COPY --from=builder /app/packages/core/dist /app/packages/core/dist
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
RUN pnpm --filter @dapp/api exec prisma generate --schema=../../packages/db/prisma/schema.prisma
EXPOSE 4000
# 启动前从根目录执行 db push，确保表存在；再启动 API
CMD ["sh", "-c", "cd /app && pnpm --filter @dapp/db exec prisma db push --accept-data-loss && cd /app/apps/api && exec node dist/index.js"]
