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

# 切換到 standalone 目錄
cd .next/standalone || exit 1

# 確保 server.js 存在
if [ ! -f "server.js" ]; then
  echo "❌ Error: server.js not found in current directory!"
  echo "   This usually means the build failed or standalone mode is not enabled."
  exit 1
fi

# 啟動 Next.js 應用
echo "🚀 Starting Next.js server on port ${PORT:-9999}..."
exec node server.js
