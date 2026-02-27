# multi-stage: build
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile || pnpm install
COPY packages/db packages/db
COPY packages/core packages/core
COPY apps/web apps/web
COPY tsconfig.base.json ./
# Build-time env for Next.js NEXT_PUBLIC_* (passed from docker-compose build args)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BASE_RPC_URL
ENV NEXT_PUBLIC_BASE_RPC_URL=$NEXT_PUBLIC_BASE_RPC_URL
ARG NEXT_PUBLIC_USDT_ADDRESS
ENV NEXT_PUBLIC_USDT_ADDRESS=$NEXT_PUBLIC_USDT_ADDRESS
ARG NEXT_PUBLIC_CHARGER_CONTRACT_ADDRESS
ENV NEXT_PUBLIC_CHARGER_CONTRACT_ADDRESS=$NEXT_PUBLIC_CHARGER_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_DEFAULT_APPROVE_AMOUNT
ENV NEXT_PUBLIC_DEFAULT_APPROVE_AMOUNT=$NEXT_PUBLIC_DEFAULT_APPROVE_AMOUNT
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
RUN pnpm --filter @dapp/core build
RUN pnpm --filter @dapp/web build

# run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
USER nextjs
WORKDIR /app/apps/web
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
