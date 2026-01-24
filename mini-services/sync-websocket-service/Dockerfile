# ========================================
# Sync WebSocket Service Dockerfile
# 九九瓦斯行管理系統
# ========================================

FROM node:lts-alpine AS base
WORKDIR /app

# ========================================
# Dependencies stage (shared with main app)
# ========================================
FROM base AS deps
WORKDIR /app

# Copy sync-service package.json
COPY mini-services/sync-websocket-service/package.json ./

# Copy main app package.json for Prisma dependencies
COPY package.json ./
COPY package-lock.json* ./

# Install all dependencies
RUN npm install --legacy-peer-deps

# ========================================
# Prisma generation stage
# ========================================
FROM base AS prisma-builder
WORKDIR /app

# Copy prisma schema from main app
COPY prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./

# Generate Prisma Client
RUN npx prisma generate

# ========================================
# Builder stage
# ========================================
FROM node:lts-alpine AS builder
WORKDIR /app

# Copy all dependencies including Prisma
COPY --from=deps /app/node_modules ./node_modules
COPY --from=prisma-builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma-builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=prisma-builder /app/node_modules/prisma ./node_modules/prisma

# Copy package.json to builder
COPY mini-services/sync-websocket-service/package.json ./package.json

# Copy source files with correct paths
COPY mini-services/sync-websocket-service/*.ts ./
COPY mini-services/sync-websocket-service/tsconfig.json ./

# Build TypeScript with explicit config
RUN npx tsc --project tsconfig.json

# ========================================
# Runner stage
# ========================================
FROM node:lts-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache \
    curl \
    postgresql-client

# Create non-root user
RUN addgroup -g 1001 -S syncsvc && \
    adduser -S syncservice -u 1001 -G syncsvc

WORKDIR /app

# Copy all node_modules (including socket.io and Prisma)
COPY --from=builder --chown=syncservice:syncsvc /app/node_modules ./node_modules

# Copy Prisma schema
COPY prisma ./prisma

# Copy built service
COPY --from=builder --chown=syncservice:syncsvc /app/dist ./dist
COPY --from=builder --chown=syncservice:syncsvc /app/package.json ./package.json

# Switch to non-root user
USER syncservice

# Expose port
EXPOSE 3005

# Health check (檢查進程是否運行)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f "node.*dist/index.js" || exit 1

# Start service
CMD ["node", "dist/index.js"]
