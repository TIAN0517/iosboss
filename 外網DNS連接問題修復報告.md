# 外網 DNS 連接問題修復報告

## 🔍 問題診斷

### 發現的問題

1. **Cloudflare Tunnel 容器不斷重啟** ❌
   - 狀態：`Restarting (1) 1 second ago`
   - 錯誤：`error parsing YAML in config file at /etc/cloudflared/config.yml: yaml: input error: read /etc/cloudflared/config.yml: is a directory`

2. **HTTP 連接失敗** ❌
   - DNS 解析成功（指向 Cloudflare IP）
   - 但返回 530 錯誤（Cloudflare 無法連接到源服務器）

3. **配置衝突** ❌
   - 同時使用 `--config` 和 `--token`
   - 這兩個選項是互斥的

---

## 🔧 修復方案

### 修復 1: 移除配置衝突

**問題**：
```yaml
command: ["tunnel", "--no-autoupdate", "--config", "/etc/cloudflared/config.yml", "run", "--token", "${CF_TUNNEL_TOKEN}"]
volumes:
  - ./cloudflared.yml:/etc/cloudflared/config.yml:ro
```

**原因**：
- `--config` 和 `--token` 是互斥的
- 使用 `--token` 時，配置由 Cloudflare Dashboard 管理
- 使用 `--config` 時，配置由本地文件管理

**修復**：
```yaml
# 使用 token 方式（配置由 Cloudflare Dashboard 管理）
command: ["tunnel", "--no-autoupdate", "run", "--token", "${CF_TUNNEL_TOKEN}"]
# 移除了 volume 掛載（不需要本地配置文件）
```

---

## ✅ 驗證步驟

### 步驟 1: 重新創建容器

```powershell
# 停止並刪除容器
docker-compose stop cloudflared
docker-compose rm -f cloudflared

# 重新創建容器
docker-compose up -d cloudflared

# 等待容器啟動（約 10-30 秒）
Start-Sleep -Seconds 30
```

### 步驟 2: 檢查容器狀態

```powershell
# 檢查容器狀態
docker ps --filter "name=jyt-gas-cloudflared"

# 應該看到狀態為 "Up" 而不是 "Restarting"
```

### 步驟 3: 檢查日誌

```powershell
# 檢查日誌（應該看到連接成功的消息）
docker logs jyt-gas-cloudflared --tail 50

# 應該看到類似：
# INF +--------------------------------------------------------------------------------------------+
# INF |  Your quick Tunnel has been created! Visit it:                                             |
# INF |  https://bossai.jytian.it.com                                                              |
# INF +--------------------------------------------------------------------------------------------+
```

### 步驟 4: 測試連接

```powershell
# 測試 DNS
Resolve-DnsName "bossai.jytian.it.com"

# 測試 HTTP（應該返回 200 而不是 530）
Invoke-WebRequest -Uri "https://bossai.jytian.it.com" -Method Head
```

---

## ⚠️ 重要提示

### Cloudflare Dashboard 配置

使用 `--token` 方式時，**必須在 Cloudflare Dashboard 中配置路由**：

1. **登入 Cloudflare Dashboard**
   - 訪問：https://dash.cloudflare.com/
   - 選擇域名：`jytian.it.com`

2. **進入 Zero Trust**
   - 點擊左側菜單 **Zero Trust**
   - 或訪問：https://one.dash.cloudflare.com/

3. **配置 Tunnel**
   - 點擊 **Access** → **Tunnels**
   - 找到您的 Tunnel（例如：`jyt-gas-tunnel`）
   - 點擊 **Configure**

4. **添加 Public Hostname**
   - 點擊 **Public Hostname** 標籤
   - 點擊 **Add a public hostname**
   - 填寫：
     - **Subdomain**: `bossai`
     - **Domain**: `jytian.it.com`
     - **Service Type**: HTTP
     - **Service URL**: `http://nginx:80`（Docker 內部網絡）
   - 點擊 **Save hostname**

5. **重複添加其他域名**（如果需要）
   - 例如：`linebot.jytian.it.com` → `http://nginx:80`

---

## 📋 檢查清單

### 修復前
- [x] 發現配置衝突
- [x] 發現容器不斷重啟
- [x] 發現 HTTP 530 錯誤

### 修復後（需要驗證）
- [ ] 容器狀態為 "Up"（不是 "Restarting"）
- [ ] 日誌顯示連接成功
- [ ] DNS 解析正常
- [ ] HTTP 連接返回 200（不是 530）
- [ ] 外網可以訪問 `https://bossai.jytian.it.com`

---

## 🎯 預期結果

修復後應該看到：

1. **容器狀態**：
   ```
   jyt-gas-cloudflared   Up X minutes   (healthy)
   ```

2. **日誌**：
   ```
   INF |  https://bossai.jytian.it.com                                                              |
   INF |  https://linebot.jytian.it.com                                                              |
   ```

3. **HTTP 連接**：
   ```
   狀態碼：200
   ```

---

## 📝 相關文件

- `docker-compose.yml` - Docker Compose 配置（已修復）
- `cloudflared.yml` - 本地配置文件（現在不需要，因為使用 --token）
- `.env.docker` - 環境變量文件（包含 CF_TUNNEL_TOKEN）

---

## ✅ 修復狀態

**修復時間**：2025-12-29 09:45

**修復狀態**：✅ 已修復配置衝突

**下一步**：重新創建容器並驗證
