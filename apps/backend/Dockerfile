# ─── Stage 1: Builder ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY turbo.json ./

# Copy package manifests (for caching)
COPY packages/types/package.json ./packages/types/
COPY apps/backend/package.json ./apps/backend/

# Install all dependencies
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/types ./packages/types
COPY apps/backend ./apps/backend

# Generate Prisma client
RUN pnpm --filter backend prisma generate

# Build shared types
RUN pnpm --filter @eduplatform/types build

# Build backend
RUN pnpm --filter backend build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config + lockfile
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

# Install prod-only deps
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/apps/backend/dist    ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma  ./apps/backend/prisma
COPY --from=builder /app/packages/types/dist  ./packages/types/dist

# Regenerate Prisma client in runner stage
RUN pnpm --filter backend prisma generate

# Create uploads dir
RUN mkdir -p /app/apps/backend/uploads && \
    chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3001

WORKDIR /app/apps/backend

CMD ["node", "dist/main.js"]
