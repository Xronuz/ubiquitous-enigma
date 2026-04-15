# ─── Stage 1: Builder ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY turbo.json ./

# Copy package manifests
COPY packages/types/package.json ./packages/types/
COPY apps/frontend/package.json ./apps/frontend/

# Install dependencies
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/types ./packages/types
COPY apps/frontend ./apps/frontend

# Build args (injected at build time for SSG/ISR)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ARG NEXT_PUBLIC_WS_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Build types
RUN pnpm --filter @eduplatform/types build

# Build Next.js app (standalone output)
RUN pnpm --filter frontend build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy Next.js standalone build
COPY --from=builder /app/apps/frontend/.next/standalone ./
COPY --from=builder /app/apps/frontend/.next/static     ./apps/frontend/.next/static
COPY --from=builder /app/apps/frontend/public           ./apps/frontend/public

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/frontend/server.js"]
