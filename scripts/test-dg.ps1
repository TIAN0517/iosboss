# Deepgram ASR Test
$DG_API_KEY = "71dbc26e3d57b3adf6f5c676c56e21592bdd1578"
$TEST_AUDIO_URL = "https://static.deepgram.com/examples/nasa-spacewalk-interview.wav"
$DG_URL = "https://api.deepgram.com/v1/listen?model=nova-3&language=zh-CN&smart_format=true&punctuate=true"

Write-Host "Testing Deepgram ASR..."
Write-Host "Downloading test audio..."
$audioFile = Join-Path $env:TEMP "test-audio.wav"
Invoke-WebRequest -Uri $TEST_AUDIO_URL -OutFile $audioFile -UseBasicParsing
$audioBytes = [System.IO.File]::ReadAllBytes($audioFile)
Write-Host "Downloaded: $($audioBytes.Length) bytes"

Write-Host "Sending to Deepgram..."
$headers = @{
    "Authorization" = "Token $DG_API_KEY"
    "Content-Type" = "audio/wav"
}

$response = Invoke-RestMethod -Uri $DG_URL -Method Post -Headers $headers -Body $audioBytes

Write-Host ""
Write-Host "========================================"
Write-Host "Deepgram ASR Test Result"
Write-Host "========================================"
Write-Host ""
Write-Host "Transcript:"
Write-Host "  $($response.results.channels[0].alternatives[0].transcript)"
Write-Host ""
Write-Host "Confidence: $($response.results.channels[0].alternatives[0].confidence.ToString('P2'))"

Remove-Item $audioFile -ErrorAction SilentlyContinue
