# 內網穿透解決方案 - 九九瓦斯行系統

## 🏠 問題說明

您的環境：
- 沒有公網 IP
- 需要讓外部系統訪問九九瓦斯行系統
  - LINE Bot Webhook
  - 會計系統數據推送
  - 車訊快遞通知

## 🚀 解決方案比較

### 方案一：Cloudflare Tunnel（推薦 - 免費且穩定）

**優點：**
- ✅ 完全免費
- ✅ 無需公網 IP
- ✅ 自動 HTTPS 憑證
- ✅ 穩定可靠
- ✅ 無流量限制
- ✅ 支援自定義域名

**安裝步驟：**

```bash
# 1. 下載 cloudflared
# Windows
# https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe

# 2. 登入 Cloudflare 帳戶
cloudflared tunnel login

# 3. 建立隧道
cloudflared tunnel create jy99gas-tunnel

# 4. 設定路由
cloudflared tunnel route dns jy99gas-tunnel jy99.your-domain.com

# 5. 執行隧道
cloudflared tunnel run jy99gas-tunnel --url http://localhost:9999
```

**設定為 Windows 服務（開機自動啟動）：**

```bash
# 安裝為服務
cloudflared service install

# 設定服務
cloudflared tunnel run jy99gas-tunnel --url http://localhost:9999

# 啟動服務
net start cloudflared
```

---

### 方案二：frp（Fast Reverse Proxy）

**優點：**
- ✅ 開源免費
- ✅ 穩定
- ✅ 可控性高
- ✅ 支援 TCP/UDP

**缺點：**
- ❌ 需要有一台有公網 IP 的 VPS

**架構：**
```
外部 VPS (有公網IP) ←→ 內網電腦 (你的系統)
     frps              frpc
```

**設定步驟：**

**1. VPS 上安裝 frps（服務端）：**

```bash
# 下載 frp
wget https://github.com/fatedier/frp/releases/download/v0.52.0/frp_0.52.0_linux_amd64.tar.gz
tar -xzf frp_0.52.0_linux_amd64.tar.gz
cd frp_0.52.0_linux_amd64

# 編輯 frps.ini
cat > frps.ini << EOF
[common]
bind_port = 7000
vhost_http_port = 8080
vhost_https_port = 8443
token = your_secure_token_here
EOF

# 啟動 frps
./frps -c frps.ini
```

**2. 內網電腦安裝 frpc（客戶端）：**

```bash
# Windows 下載
# https://github.com/fatedier/frp/releases/download/v0.52.0/frp_0.52.0_windows_amd64.zip

# 編輯 frpc.ini
cat > frpc.ini << EOF
[common]
server_addr = your_vps_ip
server_port = 7000
token = your_secure_token_here

[jy99gas]
type = http
local_ip = 127.0.0.1
local_port = 9999
custom_domains = jy99.your-domain.com
EOF

# 啟動 frpc
frpc.exe -c frpc.ini
```

---

### 方案三：ngrok（開發測試用）

**優點：**
- ✅ 最簡單，一行指令
- ✅ 無需 VPS

**缺點：**
- ❌ 免費版域名會變
- ❌ 連接數有限
- ❌ 不適合生產環境

**使用方式：**

```bash
# 1. 註冊 ngrok帳號
# https://ngrok.com/

# 2. 下載 ngrok
# Windows
# https://ngrok.com/download

# 3. 執行
ngrok http 9999

# 會得到一個臨時域名，例如：
# https://abc123.ngrok.io
```

---

### 方案四：完全本地運行（無需外網訪問）

如果只需要內網使用：

**1. 本地部署 Docker**
```bash
cd "C:\Users\tian7\OneDrive\Desktop\媽媽ios"

# 啟動所有服務
docker-compose --env-file .env.docker up -d

# 訪問
# http://localhost:9999
```

**2. 局域網內其他電腦訪問**
```bash
# 修改 .env.docker
APP_PORT=9999

# 查看本機 IP
ipconfig

# 其他電腦訪問
# http://192.168.x.x:9999
```

---

## 🏆 推薦方案：Cloudflare Tunnel

### 完整設定步驟

#### Step 1: 下載 cloudflared

訪問：https://github.com/cloudflare/cloudflared/releases

下載 `cloudflared-windows-amd64.exe`

#### Step 2: 建立隧道

```bash
# 開啟命令提示字元（cmd.exe）

# 1. 登入 Cloudflare
cloudflared.exe tunnel login

# 會開啟瀏覽器，登入你的 Cloudflare 帳號

# 2. 建立隧道
cloudflared.exe tunnel create jy99gas

# 記住輸出的 tunnel ID，例如：
# Created tunnel jy99gas with id: abc123-def456-ghi789
```

#### Step 3: 設定設定檔

建立 `cloudflared-config.yml`：

```yaml
tunnel: abc123-def456-ghi789  # 你的 tunnel ID
credentials-file: C:\\Users\\tian7\\.cloudflared\\abc123-def456-ghi789.json

ingress:
  - hostname: jy99gas.your-domain.com  # 你的域名（可選）
    service: http://localhost:9999
  - service: http://localhost:9999
```

#### Step 4: 測試執行

```bash
# 測試隧道
cloudflared.exe tunnel --config cloudflared-config.yml run

# 如果沒有域名，使用臨時域名
cloudflared.exe tunnel --url http://localhost:9999
```

#### Step 5: 設定為 Windows 服務

```bash
# 1. 安裝服務
cloudflared.exe service install

# 2. 設定服務
cloudflared.exe service config

# 按照提示輸入：
# - Tunnel ID: abc123-def456-ghi789
# - Credentials path: C:\Users\tian7\.cloudflared
# - Config path: C:\Users\tian7\OneDrive\Desktop\媽媽ios\cloudflared-config.yml

# 3. 啟動服務
net start cloudflared

# 4. 設定為自動啟動
sc config cloudflared start= auto
```

#### Step 6: 更新 LINE Bot Webhook URL

```bash
# 獲取 Cloudflare 提供的域名
# 如果沒有自定義域名，Cloudflare 會提供類似：
# https://abc-def-123.trycloudflare.com

# 更新 LINE Bot Webhook URL
https://abc-def-123.trycloudflare.com/api/webhook/line
```

---

## 🔧 整體架構

```
┌─────────────────────────────────────────────┐
│          Cloudflare Tunnel (免費)            │
│        jy99gas.trycloudflare.com             │
└──────────────────┬───────────────────────────┘
                   │
                   │ HTTPS (Cloudflare 轉發)
                   ▼
┌─────────────────────────────────────────────┐
│         你的電腦 (內網)                      │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │     Docker 容器                        │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │  九九瓦斯行系統 (Port 9999)   │  │  │
│  │  │  - Next.js 應用               │  │  │
│  │  │  - PostgreSQL (Port 5433)     │  │  │
│  │  │  - LINE Bot 整合              │  │  │
│  │  └────────────────────────────────┘  │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Cloudflared (內網穿透)              │  │
│  │  - 持續連接到 Cloudflare             │  │
│  │  - 自動重新連線                      │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 📝 設定 LINE Bot 使用新 URL

```bash
# 1. 登入 LINE Developers Console
# https://developers.line.biz/

# 2. 選擇你的 Messaging API Channel

# 3. 設定 Webhook URL
Webhook URL: https://jy99gas.trycloudflare.com/api/webhook/line

# 4. 驗證
# LINE 會發送驗證請求，確保系統正常回應
```

---

## 🔄 自動重啟腳本

如果 Cloudflare Tunnel 斷線，自動重連：

`restart-tunnel.bat`:
```batch
@echo off
:loop
echo Starting Cloudflare Tunnel...
cloudflared.exe tunnel --config cloudflared-config.yml run
echo Tunnel disconnected, reconnecting in 5 seconds...
timeout /t 5
goto loop
```

---

## ⚡ 快速開始檢查清單

- [ ] 註冊 Cloudflare 帳號（免費）
- [ ] 下載 cloudflared for Windows
- [ ] 執行 `cloudflared tunnel login`
- [ ] 建立隧道 `cloudflared tunnel create jy99gas`
- [ ] 執行隧道 `cloudflared tunnel --url http://localhost:9999`
- [ ] 測試訪問獲得的域名
- [ ] 更新 LINE Bot Webhook URL
- [ ] 設定為 Windows 服務（開機自動啟動）
- [ ] 測試 LINE Bot 是否正常

---

## 💡 維護建議

1. **監控隧道狀態**
   - 定期檢查 Cloudflare Dashboard
   - 確保隧道狀態為 "Healthy"

2. **備用方案**
   - 保留 ngrok 作為緊急備用
   - 如果 Cloudflare Tunnel 故障，快速切換

3. **日誌記錄**
   ```bash
   # 執行時加入日誌
   cloudflared.exe tunnel --config cloudflared-config.yml run --loglevel debug
   ```

4. **定期更新**
   ```bash
   # 檢查更新
   cloudflared.exe update
   ```
