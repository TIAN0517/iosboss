# 外網 DNS 連接問題診斷報告

## 🔍 問題診斷

### 當前狀態

1. **DNS 解析** ✅
   - `bossai.jytian.it.com` DNS 解析成功
   - 指向 Cloudflare IP：`172.67.165.4`, `104.21.41.134`

2. **HTTP 連接** ❌
   - 返回 530 錯誤（Cloudflare 無法連接到源服務器）
   - 說明 Cloudflare 可以接收請求，但無法連接到本地服務器

3. **Cloudflare Tunnel 容器** ❌
   - 狀態：`Restarting (1) 1 second ago`（不斷重啟）
   - 錯誤：`error parsing YAML in config file at /etc/cloudflared/config.yml: yaml: input error: read /etc/cloudflared/config.yml: is a directory`

4. **本地服務** ✅
   - `http://localhost:9999` 運行正常（狀態碼 200）

---

## 🚨 根本原因

### 問題 1: 配置文件掛載錯誤

**錯誤信息**：
```
error parsing YAML in config file at /etc/cloudflared/config.yml: 
yaml: input error: read /etc/cloudflared/config.yml: is a directory
```

**原因**：
- `cloudflared.yml` 文件可能被掛載為目錄而不是文件
- 或者 Docker volume 掛載配置有問題
- 或者存在 `cloudflared` 目錄，導致掛載衝突

**檢查**：
```powershell
# 檢查 cloudflared.yml 是否存在且為文件
Test-Path "cloudflared.yml"
(Get-Item "cloudflared.yml").PSIsContainer  # 應該是 False

# 檢查是否有 cloudflared 目錄
Test-Path "cloudflared"
```

---

## 🔧 解決方案

### 方案 1: 修復配置文件掛載（推薦）

#### 步驟 1: 檢查文件狀態

```powershell
# 檢查 cloudflared.yml 是否為文件
if ((Get-Item "cloudflared.yml").PSIsContainer) {
    Write-Host "❌ cloudflared.yml 是目錄，需要刪除"
    Remove-Item "cloudflared.yml" -Recurse -Force
    # 重新創建文件（從備份或重新配置）
}
```

#### 步驟 2: 檢查 Docker volume 掛載

```powershell
# 檢查容器掛載
docker inspect jyt-gas-cloudflared --format "{{range .Mounts}}{{.Type}} {{.Source}} -> {{.Destination}}{{println}}{{end}}"
```

#### 步驟 3: 重新創建容器

```powershell
# 停止並刪除容器
docker-compose stop cloudflared
docker-compose rm -f cloudflared

# 重新創建容器
docker-compose up -d cloudflared

# 檢查日誌
docker logs jyt-gas-cloudflared --tail 50
```

### 方案 2: 檢查並修復 cloudflared.yml 配置

確保 `cloudflared.yml` 文件：
1. 存在於項目根目錄
2. 是文件而不是目錄
3. 格式正確（YAML）
4. 包含正確的 hostname 配置

### 方案 3: 檢查 CF_TUNNEL_TOKEN

```powershell
# 檢查環境變量
docker exec jyt-gas-cloudflared printenv | grep CF_TUNNEL_TOKEN

# 如果為空，檢查 .env.docker 文件
Get-Content .env.docker | Select-String "CF_TUNNEL_TOKEN"
```

---

## 📋 驗證步驟

### 步驟 1: 檢查配置文件

```powershell
# 檢查文件
Test-Path "cloudflared.yml"
(Get-Item "cloudflared.yml").PSIsContainer  # 應該是 False

# 檢查內容
Get-Content "cloudflared.yml" | Select-Object -First 10
```

### 步驟 2: 檢查容器狀態

```powershell
# 檢查容器狀態
docker ps --filter "name=jyt-gas-cloudflared"

# 檢查日誌
docker logs jyt-gas-cloudflared --tail 50
```

### 步驟 3: 測試連接

```powershell
# 等待 30 秒讓容器完全啟動
Start-Sleep -Seconds 30

# 測試 DNS
Resolve-DnsName "bossai.jytian.it.com"

# 測試 HTTP
Invoke-WebRequest -Uri "https://bossai.jytian.it.com" -Method Head
```

---

## ⚠️ 常見問題

### 問題 1: 配置文件是目錄

**症狀**：`is a directory` 錯誤

**解決**：
```powershell
# 刪除目錄（如果存在）
if (Test-Path "cloudflared" -PathType Container) {
    Remove-Item "cloudflared" -Recurse -Force
}

# 確保 cloudflared.yml 是文件
if ((Get-Item "cloudflared.yml").PSIsContainer) {
    Remove-Item "cloudflared.yml" -Recurse -Force
    # 重新創建文件
}
```

### 問題 2: CF_TUNNEL_TOKEN 未設置

**症狀**：Tunnel 無法連接

**解決**：
1. 檢查 `.env.docker` 文件
2. 確認 `CF_TUNNEL_TOKEN` 已設置
3. 重新創建容器以應用環境變量

### 問題 3: 容器不斷重啟

**症狀**：容器狀態為 `Restarting`

**解決**：
1. 檢查日誌找出錯誤原因
2. 修復配置文件或環境變量
3. 重新創建容器

---

## 📝 相關文件

- `docker-compose.yml` - Docker Compose 配置
- `cloudflared.yml` - Cloudflare Tunnel 配置文件
- `.env.docker` - 環境變量文件

---

## ✅ 修復狀態

**診斷時間**：2025-12-29 09:40

**問題狀態**：🔴 發現關鍵問題

**下一步**：修復配置文件掛載問題
