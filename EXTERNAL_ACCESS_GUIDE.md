# ========================================
# Cloudflare Tunnel 外網訪問設置指南
# ========================================

## 方法一：重新創建 Tunnel

### 1. 刪除舊憑證
```bash
# 刪除舊憑證文件
rm C:/Users/tian7/.cloudflared/cert.pem
```

### 2. 登錄 Cloudflare
```bash
cloudflared tunnel login
# 會在瀏覽器中打開 Cloudflare 登錄頁面
# 選擇你的帳號和域名
```

### 3. 創建新 Tunnel
```bash
cloudflared tunnel create gas-station
```

### 4. 更新配置文件
將新生成的 Tunnel ID 更新到 `cloudflared-config.yml`:
```yaml
tunnel: 新的TunnelID
credentials-file: C:\Users\tian7\.cloudflared\新TunnelID.json

ingress:
  - hostname: bossai.tiankai.it.com
    service: http://127.0.0.1:9999
  - hostname: linebot.tiankai.it.com
    service: http://127.0.0.1:9997
  - service: http_status:404
```

### 5. 添加 DNS 記錄
```bash
# bossai 子域名
cloudflared tunnel route dns gas-station bossai.tiankai.it.com

# linebot 子域名
cloudflared tunnel route dns gas-station linebot.tiankai.it.com
```

### 6. 運行 Tunnel
```bash
cloudflared tunnel --config cloudflared-config.yml run gas-station
```

## 方法二：使用 ngrok（更簡單）

### 1. 下載並安裝 ngrok
訪問 https://ngrok.com/download 下載 Windows 版本

### 2. 註冊並獲取 authtoken
```bash
ngrok config add-authtoken YOUR_TOKEN
```

### 3. 運行 ngrok
```bash
# 端口 9999 (bossai)
ngrok http 9999

# 或端口 9997 (linebot)
ngrok http 9997
```

ngrok 會提供一個臨時域名，例如: https://xxxx-xx-xx-xx-xx.ngrok-free.app

## 方法三：使用 localtunnel

### 安裝並使用
```bash
npm install -g localtunnel

# bossai (port 9999)
lt --port 9999

# linebot (port 9997)
lt --port 9997
```

## 推薦方案
對於生產環境，推薦使用 **Cloudflare Tunnel**，因為：
1. 免費且穩定
2. 支持自定義域名
3. 自動 HTTPS
4. 無流量限制

對於快速測試，推薦使用 **ngrok** 或 **localtunnel**。
