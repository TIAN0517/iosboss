# Deepgram ASR 测试脚本
$ErrorActionPreference = "Stop"

# 配置
$DG_API_KEY = "71dbc26e3d57b3adf6f5c676c56e21592bdd1578"
$TEST_AUDIO_URL = "https://static.deepgram.com/examples/nasa-spacewalk-interview.wav"
$DG_URL = "https://api.deepgram.com/v1/listen?model=nova-3&language=zh-CN&smart_format=true&punctuate=true"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deepgram ASR 测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    # 1. 下载测试音频
    Write-Host "[1/2] 下载测试音频..." -ForegroundColor Yellow
    $audioFile = Join-Path $env:TEMP "test-audio.wav"
    Invoke-WebRequest -Uri $TEST_AUDIO_URL -OutFile $audioFile -UseBasicParsing
    $audioBytes = [System.IO.File]::ReadAllBytes($audioFile)
    Write-Host "  下载完成: $($audioBytes.Length) bytes" -ForegroundColor Green

    # 2. 发送到 Deepgram
    Write-Host "[2/2] 发送到 Deepgram..." -ForegroundColor Yellow

    $headers = @{
        "Authorization" = "Token $DG_API_KEY"
        "Content-Type" = "audio/wav"
    }

    $response = Invoke-RestMethod -Uri $DG_URL -Method Post -Headers $headers -Body $audioBytes

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  测试成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "识别结果:" -ForegroundColor White
    Write-Host "  $($response.results.channels[0].alternatives[0].transcript)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "置信度: $($response.results.channels[0].alternatives[0].confidence.ToString('P2'))" -ForegroundColor Green

    # 清理临时文件
    Remove-Item $audioFile -ErrorAction SilentlyContinue

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  测试失败！" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red

    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
        $errorBody = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorBody)
        $errorText = $reader.ReadToEnd()
        Write-Host "响应内容: $errorText" -ForegroundColor Gray
    }
}

Write-Host ""
