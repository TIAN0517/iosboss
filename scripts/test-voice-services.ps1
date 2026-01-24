# ========================================
# 九九瓦斯行 - 语音服务测试脚本
# Deepgram ASR + Azure TTS 测试
# ========================================

# 配置（从环境变量读取，不在此硬编码）
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " 语音服务测试 - Deepgram + Azure" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ========================================
# 1. 测试 Deepgram 预录音 ASR
# ========================================
Write-Host "[1/3] 测试 Deepgram 预录音 ASR..." -ForegroundColor Yellow

$DG_API_KEY = $env:DG_API_KEY
if (-not $DG_API_KEY) {
    Write-Host "  ⚠️  DG_API_KEY 未设置，跳过 Deepgram 测试" -ForegroundColor Red
} else {
    try {
        # 使用 Deepgram 官方示例音频
        $testAudioUrl = "https://static.deepgram.com/examples/nasa-spacewalk-interview.wav"

        $dgParams = @{
            model = if ($env:DG_MODEL) { $env:DG_MODEL } else { "nova-3" }
            language = if ($env:DG_LANGUAGE) { $env:DG_LANGUAGE } else { "zh-CN" }
            smart_format = "true"
            punctuate = "true"
        }

        $dgUrl = "https://api.deepgram.com/v1/listen"
        $queryString = ($dgParams.GetEnumerator() | ForEach-Object { "$($_.Key)=$($_.Value)" }) -join "&"
        $fullUrl = "$dgUrl?$queryString"

        Write-Host "  URL: $fullUrl" -ForegroundColor Gray
        Write-Host "  下载测试音频..." -ForegroundColor Gray

        $audioResponse = Invoke-WebRequest -Uri $testAudioUrl -Method Get -UseBasicParsing
        $audioBytes = $audioResponse.Content

        Write-Host "  发送到 Deepgram (Audio: $($audioBytes.Length) bytes)..." -ForegroundColor Gray

        $response = Invoke-RestMethod -Uri $fullUrl -Method Post `
            -Headers @{
                "Authorization" = "Token $DG_API_KEY"
                "Content-Type" = "audio/wav"
            } `
            -Body $audioBytes

        Write-Host "  ✅ Deepgram ASR 成功！" -ForegroundColor Green
        Write-Host "     识别结果: $($response.results.channels[0].alternatives[0].transcript)" -ForegroundColor White
        Write-Host "     置信度: $($response.results.channels[0].alternatives[0].confidence)" -ForegroundColor White
    } catch {
        Write-Host "  ❌ Deepgram ASR 失败: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""

# ========================================
# 2. 测试 Azure TTS
# ========================================
Write-Host "[2/3] 测试 Azure TTS..." -ForegroundColor Yellow

$AZ_SPEECH_KEY = $env:AZ_SPEECH_KEY
if (-not $AZ_SPEECH_KEY) {
    Write-Host "  ⚠️  AZ_SPEECH_KEY 未设置，跳过 Azure TTS 测试" -ForegroundColor Red
} else {
    try {
        $AZ_REGION = if ($env:AZ_SPEECH_REGION) { $env:AZ_SPEECH_REGION } else { "southeastasia" }
        $AZ_VOICE = if ($env:AZ_TTS_VOICE) { $env:AZ_TTS_VOICE } else { "zh-CN-XiaoxiaoNeural" }
        $AZ_FORMAT = if ($env:AZ_TTS_FORMAT) { $env:AZ_TTS_FORMAT } else { "audio-16khz-128kbitrate-mono-mp3" }

        $testText = "你好，这是语音测试。我是九九瓦斯行的智能助手。"

        # 构建 SSML
        $ssml = @"
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
  <voice name="$AZ_VOICE">
    <prosody rate="1.0" pitch="0%">
      $testText
    </prosody>
  </voice>
</speak>
"@

        $azureUrl = "https://$AZ_REGION.tts.speech.microsoft.com/cognitiveservices/v1"

        Write-Host "  URL: $azureUrl" -ForegroundColor Gray
        Write-Host "  Voice: $AZ_VOICE" -ForegroundColor Gray
        Write-Host "  测试文本: $testText" -ForegroundColor Gray

        $response = Invoke-RestMethod -Uri $azureUrl -Method Post `
            -Headers @{
                "Ocp-Apim-Subscription-Key" = $AZ_SPEECH_KEY
                "Content-Type" = "application/ssml+xml"
                "X-Microsoft-OutputFormat" = $AZ_FORMAT
            } `
            -Body $ssml

        # 保存音频到文件
        $outputFile = Join-Path $PSScriptRoot "test_azure_tts.mp3"
        [System.IO.File]::WriteAllBytes($outputFile, $response)

        $fileSize = (Get-Item $outputFile).Length

        Write-Host "  ✅ Azure TTS 成功！" -ForegroundColor Green
        Write-Host "     输出文件: $outputFile ($fileSize bytes)" -ForegroundColor White
        Write-Host "     可以播放该文件验证语音质量" -ForegroundColor Gray
    } catch {
        Write-Host "  ❌ Azure TTS 失败: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "     HTTP Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
        }
    }
}

Write-Host ""

# ========================================
# 3. 测试本地 API 端点
# ========================================
Write-Host "[3/3] 测试本地语音 API..." -ForegroundColor Yellow

$apiBaseUrl = "http://localhost:9999"

try {
    # 测试 GET /api/voice/realtime
    Write-Host "  检查实时语音端点..." -ForegroundColor Gray
    $response = Invoke-RestMethod -Uri "$apiBaseUrl/api/voice/realtime" -Method Get

    Write-Host "  ✅ API 端点可用" -ForegroundColor Green
    Write-Host "     Deepgram: $(if ($response.services.deepgram.available) { '✅' } else { '❌' })" -ForegroundColor White
    Write-Host "     Azure: $(if ($response.services.azure.available) { '✅' } else { '❌' })" -ForegroundColor White

    # 显示 WebSocket 连接信息
    Write-Host ""
    Write-Host "  WebSocket 连接信息:" -ForegroundColor Cyan
    Write-Host "     URL: $($response.client_example.connect_to)" -ForegroundColor White
    Write-Host "     发送: $($response.client_example.send_format | ConvertTo-Json -Compress)" -ForegroundColor Gray
    Write-Host "     接收: $($response.client_example.receive_format | ConvertTo-Json -Compress)" -ForegroundColor Gray

} catch {
    Write-Host "  ⚠️  本地 API 不可用（可能未启动）" -ForegroundColor Yellow
    Write-Host "     请先运行: docker-compose --env-file .env.docker up -d" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示：" -ForegroundColor Gray
Write-Host "  1. 如果 API Key 泄漏，请立即在控制台 Rotate/Revoke" -ForegroundColor Yellow
Write-Host "  2. 确保所有 API Key 都存储在 .env 文件中" -ForegroundColor Yellow
Write-Host "  3. 日志中不得输出完整 API Key" -ForegroundColor Yellow
Write-Host ""

# ========================================
# 4. WebSocket 测试说明
# ========================================
Write-Host "WebSocket 测试方法：" -ForegroundColor Cyan
Write-Host "  使用 Node.js 脚本测试（推荐）:" -ForegroundColor Gray
Write-Host "    node scripts/test-voice-websocket.mjs" -ForegroundColor White
Write-Host ""
Write-Host "  或使用 wscat 工具:" -ForegroundColor Gray
Write-Host "    wscat -c ws://localhost:9999/api/voice/ws" -ForegroundColor White
Write-Host ""
Write-Host "  消息格式示例:" -ForegroundColor Gray
Write-Host "    发送: {`"type`":`"audio`",`"data`":`"<base64 audio>`"}" -ForegroundColor White
Write-Host "    接收: {`"type`":`"interim`",`"text`":`"...`"}" -ForegroundColor White
Write-Host "          {`"type`":`"final`",`"text`":`"完整文字`"}" -ForegroundColor White
Write-Host "          {`"type`":`"ai_text`",`"text`":`"AI回复`"}" -ForegroundColor White
Write-Host "          {`"type`":`"ai_audio`",`"data`":`"<base64 mp3>`"}" -ForegroundColor White
Write-Host ""
