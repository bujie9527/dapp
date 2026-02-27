# 使用 next start 而非 standalone，保证 /_next/static 正常
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile || pnpm install
COPY apps/admin apps/admin
# Build-time env for Next.js NEXT_PUBLIC_API_URL (passed from docker-compose build args)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @dapp/admin build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* /app/pnpm-workspace.yaml ./
COPY --from=builder /app/apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next apps/admin/.next
COPY --from=builder /app/apps/admin/public apps/admin/public
USER nextjs
EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
CMD ["pnpm", "--filter", "@dapp/admin", "start"]
