# ========================================
# 九九瓦斯行系統 - 部署指南
# ========================================

## 架構說明

```
外網使用者
     │
     ▼
┌─────────────────────────────────────────┐
│         Cloudflare Tunnel               │
│  (自動 HTTPS SSL 憑證)                  │
└─────────────────────────────────────────┘
     │           │           │
     ▼           ▼           ▼
bossai.tiankai.it.com  linebot.tiankai.it.com  ollama.tiankai.it.com
     │           │           │
     ▼           ▼           ▼
 localhost:9999   localhost:9999   localhost:11434
     │                        │
     ▼                        ▼
  Next.js              Ollama (本地 GPU)
  應用程式              qwen2.5:14b 模型
```

## 網域配置

| 網域 | 用途 | 本機連接埠 |
|------|------|-----------|
| bossai.tiankai.it.com | 主應用程式 | 9999 |
| linebot.tiankai.it.com | LINE Bot Webhook | 9999 |
| ollama.tiankai.it.com | Ollama AI API | 11434 |

## 快速啟動

### 1. 啟動 Cloudflare Tunnel

```bash
# 停止現有程序
taskkill /F /IM cloudflared.exe

# 啟動 Tunnel（使用新配置）
cloudflared.exe tunnel --config "C:\Users\tian7\.cloudflared\config.yml" run
```

### 2. 驗證 Tunnel 連線

查看 Cloudflare Tunnel 日誌，確認看到：
```
INF Registered tunnel connection connIndex=0
```

### 3. 測試 API 連線

```bash
# 測試本機 Ollama
curl http://localhost:11434/api/tags

# 測試外網 Ollama
curl https://ollama.tiankai.it.com/api/tags

# 測試 AI 回覆
curl -X POST https://ollama.tiankai.it.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen2.5:14b","messages":[{"role":"user","content":"你好"}],"stream":false}'
```

## 遷移到 VPS 時的考量

### 方案 A：保持本地 GPU（推薦）

VPS 只部署 Next.js 應用程式，Ollama 留在本地：

```
┌─────────────┐         ┌─────────────┐
│    VPS      │  API    │  本地伺服器 │
│  Next.js    │◄───────►│  Ollama GPU │
└─────────────┘         └─────────────┘
     │                       ▲
     │                       │
     └─────── Cloudflare ────┘
           (Tunnel)
```

配置：
1. VPS 上的 Next.js 環境變數：
   ```
   OLLAMA_BASE_URL=https://ollama.tiankai.it.com
   ```

### 方案 B：完整遷移到 VPS

如果 VPS 有 GPU：
1. 安裝 Ollama 在 VPS
2. 更新 `.env`：
   ```
   OLLAMA_BASE_URL=http://localhost:11434
   ```
3. 移除 Tunnel 中的 ollama 路由

## 檔案清單

| 檔案 | 說明 |
|------|------|
| `C:\Users\tian7\.cloudflared\config.yml` | Tunnel 路由配置 |
| `nginx-bossai.conf` | Nginx 反向代理配置 |
| `start-services.bat` | 啟動腳本 |
| `test-ollama.bat` | API 測試腳本 |

## 常見問題

### Q: Tunnel 連線失敗
A: 檢查網路連線，確認 Cloudflare daemon 正在運行

### Q: Ollama API 逾時
A: 增加 Tunnel 連線超時設定，已在 config.yml 中調整為 60s

### Q: 如何查看 Tunnel 狀態
A: 訪問 http://127.0.0.1:20242/metrics 或查看命令列輸出

## 生產環境建議

1. **使用 Systemd 服務**（Linux）：
   ```ini
   [Unit]
   Description=Cloudflare Tunnel
   After=network.target

   [Service]
   Type=simple
   ExecStart=/usr/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
   Restart=always
   User=root

   [Install]
   WantedBy=multi-user.target
   ```

2. **監控**：設定 health check 定期檢測服務狀態

3. **日誌**：輪替日誌避免佔用過多空間
