# Stage 1: install dependencies
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate
WORKDIR /app

# Workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc turbo.json ./

# Package manifests only
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/db/package.json ./packages/db/package.json

RUN pnpm install --frozen-lockfile --filter @pikorua/api... --ignore-scripts

# Stage 2: build
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@11.5.0 --activate
WORKDIR /app

COPY --from=deps /app ./

# Source files
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db

# Build dependency packages first, then api
RUN pnpm --filter @pikorua/shared build
RUN pnpm --filter @pikorua/db build
RUN pnpm --filter @pikorua/api build

# Stage 3: production image
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nestjs

# Preserve pnpm's workspace node_modules layout. App dependency links under
# apps/api/node_modules point into the root node_modules/.pnpm store, while
# workspace package links point to packages/db and packages/shared.
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nestjs:nodejs /app/packages/db ./packages/db
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./packages/shared

USER nestjs
EXPOSE 4000
ENV API_PORT=4000

WORKDIR /app/apps/api
CMD ["node", "dist/main"]
