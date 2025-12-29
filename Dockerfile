# ========================================
# 九九瓦斯行管理系統 - Dockerfile
# Next.js 15 + PostgreSQL + Prisma
# 多階段建置：builder + runner
# ========================================

# ========================================
# 階段 1：Dependencies (依賴層 - 快取優化)
# ========================================
FROM node:lts-alpine AS deps

# 安裝 libc6-compat 以提高相容性
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 複製套件管理文件
COPY package.json ./
COPY package-lock.json* ./
COPY bun.lockb* ./

# 安裝所有依賴（使用 install 而非 ci，容許 lockfile 不完全同步）
RUN npm install --legacy-peer-deps

# ========================================
# 階段 2：Builder (建置應用)
# ========================================
FROM node:lts-alpine AS builder

WORKDIR /app

# 複製依賴
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 設置建置環境變量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 生成 Prisma Client（在 build 之前）
# 確保 Prisma schema 存在並生成 Client
RUN if [ ! -f "prisma/schema.prisma" ]; then \
      echo "❌ Error: prisma/schema.prisma not found!" && exit 1; \
    fi && \
    echo "🔧 Generating Prisma Client..." && \
    npx prisma generate && \
    echo "✅ Prisma Client generated successfully!"

# 建置 Next.js 應用
# 使用完整的構建輸出（不使用 standalone 模式），以確保 API 路由正常工作
RUN echo "🏗️  Building Next.js application..." && \
    npm run build && \
    echo "✅ Build completed successfully!"

# ========================================
# 階段 3：Runner (生產環境運行)
# ========================================
FROM node:lts-alpine AS runner

WORKDIR /app

# 設置生產環境變量
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=9999

# 安裝必要的系統工具
# ffmpeg: 音頻轉碼（LINE m4a/ogg/webm -> 16k mono wav for Deepgram）
RUN apk add --no-cache \
    curl \
    netcat-openbsd \
    openssl \
    postgresql-client \
    bash \
    ffmpeg

# 創建非 root 用戶 (安全性)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# 複製必要的文件
# 注意：順序很重要！
# 在 standalone 模式下，Next.js 會將所有必要的文件複製到 .next/standalone/
# 但我們也需要複製源文件以確保開發時的文件結構正確

# 複製 public 目錄（靜態資源）
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 複製 .next 目錄（包含構建輸出和 standalone 文件）
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next

# 複製 src 目錄（源文件，確保 API 路由和頁面可用）
# 在 standalone 模式下，這些文件會被 Next.js 自動包含，但保留源文件以備不時之需
COPY --from=builder --chown=nextjs:nodejs /app/src ./src

# 複製 Prisma 相關文件（用於遷移和生成）
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# 複製完整的 node_modules（確保 Prisma CLI 和所有依賴可用）
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# 複製 package.json（用於運行 npm scripts）
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# 複製啟動腳本
COPY --chown=nextjs:nodejs db/init/01-init.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# 創建數據目錄
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# 切換到非 root 用戶
USER nextjs

# 暴露端口
EXPOSE 9999

# 健康檢查 (檢查進程是否運行)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD pgrep -f "node.*server.js" || exit 1

# 使用啟動腳本
CMD ["/app/docker-entrypoint.sh"]
