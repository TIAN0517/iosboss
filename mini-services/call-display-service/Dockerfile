# ========================================
# Call Display Service Dockerfile
# 九九瓦斯行管理系統
# ========================================

FROM oven/bun:1-alpine AS base
WORKDIR /app

# ========================================
# Dependencies stage
# ========================================
FROM base AS deps
COPY package.json ./
RUN bun install --frozen-lockfile

# ========================================
# Builder stage
# ========================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun build index.ts --target node --outdir ./dist

# ========================================
# Runner stage
# ========================================
FROM base AS runner

# Install runtime dependencies
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 -S callsvc && \
    adduser -S callservice -u 1001 -G callsvc

WORKDIR /app

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder --chown=callservice:callsvc /app/package.json ./package.json

# Switch to non-root user
USER callservice

# Expose port
EXPOSE 3004

# Health check (檢查進程是否運行)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD pgrep -f "bun.*dist/index.js" || exit 1

# Start service
CMD ["bun", "dist/index.js"]
