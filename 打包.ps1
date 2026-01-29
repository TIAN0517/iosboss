$source = "C:\Users\tian7\OneDrive\Desktop\媽媽ios"
$dest = "C:\Users\tian7\OneDrive\Desktop\VPS_Package.zip"

Write-Host "開始打包..."
Write-Host "來源: $source"
Write-Host "目標: $dest"

# 移除舊檔案
if (Test-Path $dest) {
    Remove-Item $dest -Force
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($source, $dest, [System.IO.Compression.CompressionLevel]::Optimal, $false)

if (Test-Path $dest) {
    $size = [math]::Round((Get-Item $dest).Length / 1MB, 2)
    Write-Host "完成! 檔案大小: $size MB"
} else {
    Write-Host "打包失敗"
}
