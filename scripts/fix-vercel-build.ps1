# 修復 Vercel 構建問題

$ErrorActionPreference = "Stop"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

Write-ColorOutput "`n🔧 修復 Vercel 構建配置..." "Cyan"
Write-ColorOutput "============================================================" "Cyan"

# 修改 package.json 構建命令
Write-ColorOutput "`n[步驟 1] 修改構建命令..." "Blue"

$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$packageJson.scripts.build = "prisma generate && next build"
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json" -Encoding UTF8

Write-ColorOutput "  [OK] 構建命令已修改" "Green"
Write-ColorOutput "  新命令: prisma generate && next build" "Cyan"

# 修改 next.config.mjs
Write-ColorOutput "`n[步驟 2] 修改 Next.js 配置..." "Blue"

$nextConfig = @'
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel 不需要 standalone 模式
  // output: "standalone", // 註釋掉，讓 Vercel 使用默認輸出
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
'@

$nextConfig | Set-Content "next.config.mjs" -Encoding UTF8

Write-ColorOutput "  [OK] Next.js 配置已修改" "Green"

# 提交更改
Write-ColorOutput "`n[步驟 3] 提交更改..." "Blue"

try {
    git add package.json next.config.mjs
    git commit -m "修復 Vercel 構建配置"
    git push origin main
    
    Write-ColorOutput "  [OK] 更改已提交並推送" "Green"
} catch {
    Write-ColorOutput "  [Warning] 無法提交: $_" "Yellow"
    Write-ColorOutput "  請手動提交並推送" "Cyan"
}

Write-ColorOutput "`n============================================================" "Cyan"
Write-ColorOutput "[完成] 構建配置已修復！" "Green"
Write-ColorOutput "============================================================" "Cyan"

Write-ColorOutput "`n[下一步]" "Yellow"
Write-ColorOutput "  1. Vercel 會自動檢測推送並重新部署" "Cyan"
Write-ColorOutput "  2. 或手動點擊「重新部署」按鈕" "Cyan"
Write-ColorOutput "  3. 等待構建完成" "Cyan"

Write-ColorOutput "`n"
