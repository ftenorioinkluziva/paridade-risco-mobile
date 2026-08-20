FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/remote-mcp/package.json ./apps/remote-mcp/package.json
COPY packages/cli/package.json ./packages/cli/package.json
COPY packages/local-mcp/package.json ./packages/local-mcp/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/telegram-bot/package.json ./packages/telegram-bot/package.json
RUN npm ci

FROM base AS builder
ARG DATABASE_URL
WORKDIR /app
COPY --from=deps /app ./
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
ENV DATABASE_URL=$DATABASE_URL
RUN npm run build --workspace=@paridade-risco/api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/.next/static ./apps/api/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/public ./apps/api/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/src/db ./apps/api/src/db
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/src/lib ./apps/api/src/lib
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/src/scripts ./apps/api/src/scripts
COPY --from=builder --chown=nextjs:nodejs /app/packages/shared ./packages/shared

COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nextjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "apps/api/server.js"]
