#!/bin/bash

# ========================================
# 九九瓦斯行管理系統 - 導入到 Supabase 腳本
# ========================================

set -e

echo "🗄️ 開始導入數據到 Supabase..."

# 檢查參數
if [ $# -ne 1 ]; then
    echo "❌ 錯誤：請提供 SQL 文件路徑"
    echo "用法: ./import-to-supabase.sh <sql-file-path>"
    exit 1
fi

SQL_FILE=$1

# 檢查文件是否存在
if [ ! -f "$SQL_FILE" ]; then
    echo "❌ 錯誤：文件不存在: $SQL_FILE"
    exit 1
fi

# 檢查 SUPABASE_URL 環境變量
if [ -z "$SUPABASE_URL" ]; then
    echo "❌ 錯誤：SUPABASE_URL 環境變量未設置"
    echo "請執行：export SUPABASE_URL='postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres'"
    exit 1
fi

echo "📦 導入文件: $SQL_FILE"
echo "🌐 目標: $SUPABASE_URL"
echo ""

# 導入數據庫
psql "$SUPABASE_URL" < "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 數據導入成功！"
    echo "📝 現在可以在 Supabase Dashboard 查看數據"
else
    echo "❌ 數據導入失敗"
    exit 1
fi
