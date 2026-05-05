# ─── Stage 1: Builder ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm@9.15.4

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

# Generate Prisma client — use `exec` so pnpm invokes the binary directly.
# `pnpm --filter backend prisma generate` silently skips (no script named
# "prisma" in package.json); `exec` avoids that trap.
RUN pnpm --filter backend exec prisma generate

# Build shared types
RUN pnpm --filter @eduplatform/types build

# Build backend
RUN pnpm --filter backend build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

WORKDIR /app

# Copy workspace manifests
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/apps/backend/package.json ./apps/backend/

# pnpm workspace node_modules structure:
#   /app/node_modules/           → .pnpm virtual store (actual package files)
#   /app/apps/backend/node_modules/ → per-package symlinks into the .pnpm store
# Both layers must be copied so Node.js can resolve backend dependencies.
# Copying only the root node_modules leaves @nestjs/core etc. unresolvable.
COPY --from=builder /app/node_modules              ./node_modules
COPY --from=builder /app/apps/backend/node_modules ./apps/backend/node_modules

# Copy built artifacts
COPY --from=builder /app/apps/backend/dist    ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma  ./apps/backend/prisma
COPY --from=builder /app/packages/types/dist  ./packages/types/dist

# Create uploads dir and set ownership only on app code + writable dirs.
# node_modules is root-owned but world-readable — no need to chown it,
# and doing so would recurse ~500k pnpm hard-links (adds 140 s to build).
RUN mkdir -p /app/apps/backend/uploads && \
    chown -R nestjs:nodejs \
      /app/apps/backend/dist \
      /app/apps/backend/prisma \
      /app/apps/backend/uploads \
      /app/packages

USER nestjs

EXPOSE 3001

WORKDIR /app/apps/backend

CMD ["node", "dist/main.js"]
