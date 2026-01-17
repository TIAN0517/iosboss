# LINE Bot AI 一键部署脚本（Windows）

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🚀 LINE Bot AI Docker 部署" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 检查 .env 文件
if (!(Test-Path .env)) {
    Write-Host "⚠️  未找到 .env 文件，从 .env.example 创建..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "📝 请编辑 .env 文件，填入你的 API 密钥！" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "必需配置：" -ForegroundColor White
    Write-Host "  - GLM_KEY=你的_GLM4.7_API_KEY" -ForegroundColor Gray
    Write-Host "  - LINE_CHANNEL_ACCESS_TOKEN=你的_LINE_TOKEN" -ForegroundColor Gray
    Write-Host "  - LINE_CHANNEL_SECRET=你的_LINE_SECRET" -ForegroundColor Gray
    Write-Host ""
    Read-Host "按 Enter 配置完成后继续"
}

# 停止旧容器
Write-Host "🛑 停止旧容器..." -ForegroundColor Gray
docker compose down

# 构建镜像
Write-Host "🔨 构建 Docker 镜像..." -ForegroundColor Gray
docker compose build

# 启动服务
Write-Host "🚀 启动服务..." -ForegroundColor Gray
docker compose up -d

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "✅ 部署完成！" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "服务状态：" -ForegroundColor White
docker ps --filter "name=line-bot-ai"
Write-Host ""
Write-Host "查看日志：" -ForegroundColor White
Write-Host "  docker logs -f line-bot-ai" -ForegroundColor Gray
Write-Host ""
Write-Host "Webhook URL：" -ForegroundColor White
Write-Host "  https://你的域名/api/webhook/line" -ForegroundColor Cyan
Write-Host ""
