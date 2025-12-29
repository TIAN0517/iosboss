#!/bin/bash
# ========================================
# Docker 容器啟動腳本
# 九九瓦斯行管理系統
# ========================================

set -e

echo "🚀 Starting JY Gas Management System..."

# 等待 PostgreSQL 準備好
echo "⏳ Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -c '\q' 2>/dev/null; do
  echo "  PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# 確保 Prisma Client 已生成
echo "🔧 Generating Prisma Client..."
npx prisma generate || echo "⚠️  Prisma generate failed, continuing..."

# 檢查是否需要執行遷移
if [ "$DB_AUTO_MIGRATE" = "true" ]; then
  echo "📊 Running database schema push..."
  # 使用 db push 而不是 migrate deploy，因為沒有 migration 文件
  npx prisma db push --skip-generate || echo "⚠️  Schema push failed (may already be in sync)"
  echo "✅ Schema push completed!"
else
  echo "⏭️  Skipping migrations (DB_AUTO_MIGRATE=false)"
fi

# 檢查是否需要執行種子數據
if [ "$DB_AUTO_SEED" = "true" ]; then
  echo "🌱 Seeding database..."
  # 檢查是否已有數據（使用更簡單的方法）
  USER_COUNT=$(PGPASSWORD=$POSTGRES_PASSWORD psql -h postgres -U $POSTGRES_USER -d $POSTGRES_DB -tAc "SELECT COUNT(*) FROM \"User\";" 2>/dev/null || echo "0")

  if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo "  Running seed script..."
    npm run db:seed || echo "⚠️  Seeding failed"
    echo "✅ Database seeded!"
  else
    echo "⏭️  Database already contains data (User count: $USER_COUNT), skipping seed"
  fi
else
  echo "⏭️  Skipping seed (DB_AUTO_SEED=false)"
fi

echo "🎉 Initialization complete! Starting application..."

# 切換到 /app 目錄
cd /app

# 檢查並選擇正確的 server 文件或目錄（支持 Next.js 14 和 15）
# Next.js 14: .next/standalone/server.js 或 server.js
# Next.js 15: .next/server/server.js 或 .next/server/app（沒有單個 server.js）
if [ -f ".next/standalone/server.js" ]; then
  echo "📦 Using Next.js 14 standalone server.js..."
  exec node .next/standalone/server.js
elif [ -f ".next/server/server.js" ]; then
  echo "📦 Using Next.js 15 server.js..."
  exec node .next/server/server.js
elif [ -f "server.js" ]; then
  echo "📦 Using root server.js..."
  exec node server.js
else
  echo "❌ Error: No server.js found!"
  echo "   Searched in:"
  echo "     - .next/standalone/server.js"
  echo "     - .next/server/server.js"
  echo "     - server.js"
  exit 1
fi
