#!/bin/bash

# ========================================
# 九九瓦斯行管理系統 - 遷移狀態檢查腳本
# ========================================

echo "🔍 檢查遷移前狀態..."
echo ""

# 1. 檢查 Docker 容器狀態
echo "📦 Docker 容器狀態："
docker ps --filter "name=jyt-gas" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# 2. 檢查數據庫大小
echo "🗄️ 數據庫大小："
DB_SIZE=$(docker exec jyt-gas-postgres pg_database_size -U postgres gas_management 2>/dev/null || echo "N/A")
if [ "$DB_SIZE" != "N/A" ]; then
    echo "   gas_management: $DB_SIZE"
else
    echo "   gas_management: (正在計算...)"
    docker exec jyt-gas-postgres psql -U postgres -d gas_management -c "SELECT pg_size_pretty(pg_database_size('gas_management')) as size;" 2>/dev/null || echo "   無法獲取"
fi
echo ""

# 3. 檢查數據表
echo "📊 數據表數量："
TABLE_COUNT=$(docker exec jyt-gas-postgres psql -U postgres -d gas_management -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ' || echo "N/A")
echo "   共 $TABLE_COUNT 個表"
echo ""

# 4. 檢查記錄數量
echo "📋 主要表記錄數量："
docker exec jyt-gas-postgres psql -U postgres -d gas_management -c "
SELECT 
  schemaname,
  tablename,
  n_tup_ins as total_records
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY n_tup_ins DESC
LIMIT 10;
" 2>/dev/null || echo "   無法獲取"
echo ""

# 5. 檢查環境變量文件
echo "⚙️ 環境變量文件："
if [ -f ".env.docker" ]; then
    echo "   ✅ .env.docker 存在"
else
    echo "   ❌ .env.docker 不存在"
fi

if [ -f ".env.vercel.template" ]; then
    echo "   ✅ .env.vercel.template 存在"
else
    echo "   ❌ .env.vercel.template 不存在"
fi
echo ""

# 6. 檢查 Prisma
echo "🔧 Prisma 配置："
if [ -f "prisma/schema.prisma" ]; then
    MODEL_COUNT=$(grep -c "^model " prisma/schema.prisma || echo "0")
    echo "   ✅ prisma/schema.prisma 存在"
    echo "   📦 包含 $MODEL_COUNT 個模型"
else
    echo "   ❌ prisma/schema.prisma 不存在"
fi
echo ""

# 7. 檢查備份目錄
echo "💾 備份文件："
BACKUP_DIR="./backups/migration"
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l)
    echo "   📁 備份目錄存在"
    echo "   📄 已有 $BACKUP_COUNT 個備份文件"
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        echo "   最新備份："
        ls -lt "$BACKUP_DIR"/*.sql 2>/dev/null | head -1 | awk '{print "      " $9 " (" $6 " " $7 " " $8 ")"}'
    fi
else
    echo "   ❌ 備份目錄不存在，請先執行：mkdir -p $BACKUP_DIR"
fi
echo ""

# 8. 檢查 Git
echo "🌿 Git 狀態："
if [ -d ".git" ]; then
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null)
    LATEST_COMMIT=$(git log -1 --pretty=format:"%h - %s (%cr)" 2>/dev/null)
    echo "   ✅ Git 倉庫已初始化"
    echo "   🌿 當前分支: $CURRENT_BRANCH"
    echo "   📝 提交數量: $COMMIT_COUNT"
    echo "   🔨 最新提交: $LATEST_COMMIT"
else
    echo "   ❌ Git 倉庫未初始化"
fi
echo ""

# 9. 總結
echo "✅ 遷移前檢查完成！"
echo ""
echo "📝 下一步："
echo "1. 如果備份文件不存在，執行："
echo "   PowerShell: .\\export-docker-db.ps1"
echo "   Bash: ./export-docker-db.sh"
echo ""
echo "2. 然後按照 MIGRATION_TO_VERCEL_SUPABASE.md 繼續遷移"
