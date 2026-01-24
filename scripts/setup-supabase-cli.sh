#!/bin/bash
# Supabase CLI 設置腳本（Bash）
# 用於自動配置 Supabase CLI 和訪問令牌

ACCESS_TOKEN="${1:-sbp_a083055ee9dd7750eb7b2c34026eb56b0bed294c}"
PROJECT_REF="${2:-mdmltksbpdyndoisnqhy}"

echo ""
echo "🚀 設置 Supabase CLI..."
echo "============================================================"

# 檢查 Supabase CLI 是否安裝
echo ""
echo "📦 檢查 Supabase CLI 安裝..."
if command -v supabase &> /dev/null; then
    VERSION=$(supabase --version)
    echo "  ✅ Supabase CLI 已安裝: $VERSION"
else
    echo "  ❌ Supabase CLI 未安裝"
    echo ""
    echo "💡 安裝方法："
    echo "   1. 使用 npm: npm install -g supabase"
    echo "   2. 使用 Homebrew (Mac): brew install supabase/tap/supabase"
    echo "   3. 訪問: https://supabase.com/docs/reference/cli"
    exit 1
fi

# 設置環境變數
echo ""
echo "🔐 設置訪問令牌..."
export SUPABASE_ACCESS_TOKEN="$ACCESS_TOKEN"
echo "  ✅ 訪問令牌已設置"

# 登入
echo ""
echo "🔑 登入 Supabase..."
if supabase login --token "$ACCESS_TOKEN" 2>&1; then
    echo "  ✅ 登入成功"
else
    echo "  ❌ 登入失敗"
    exit 1
fi

# 鏈接專案
echo ""
echo "🔗 鏈接專案..."
if supabase link --project-ref "$PROJECT_REF" 2>&1; then
    echo "  ✅ 專案鏈接成功"
    echo "   專案 ID: $PROJECT_REF"
else
    echo "  ⚠️  鏈接可能失敗，請手動檢查"
    echo "   您可以稍後手動執行: supabase link --project-ref $PROJECT_REF"
fi

# 驗證連接
echo ""
echo "🔍 驗證連接..."
if STATUS=$(supabase status 2>&1); then
    echo "  ✅ 連接正常"
    echo ""
    echo "📊 專案狀態："
    echo "$STATUS"
else
    echo "  ⚠️  無法獲取狀態"
fi

# 總結
echo ""
echo "============================================================"
echo "✅ Supabase CLI 設置完成！"
echo ""
echo "💡 常用命令："
echo "   supabase status          - 查看專案狀態"
echo "   supabase db pull         - 拉取數據庫結構"
echo "   supabase db push         - 推送遷移"
echo "   supabase functions list  - 列出函數"
echo "   supabase logs            - 查看日誌"
echo ""
echo "📖 參考文檔："
echo "   docs/SUPABASE_CLI_CONFIGURATION.md"
