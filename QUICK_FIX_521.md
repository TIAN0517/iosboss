# 快速修復 521 錯誤

## 🔍 問題原因

521 錯誤表示 Cloudflare 無法連接到源服務器，原因是：
- Cloudflare Tunnel 未配置或未運行
- `CF_TUNNEL_TOKEN` 環境變量未設置

## ✅ 快速解決方案

### 方案 1：暫時禁用 Cloudflare Tunnel（最快）

```bash
# 停止 Cloudflare Tunnel 容器
docker compose stop cloudflared

# 或從 docker-compose.yml 中註釋掉 cloudflared 服務
```

**注意**：這會導致外網無法訪問，但本地和內網可以正常使用。

### 方案 2：配置 Cloudflare Tunnel（推薦）

#### 步驟 1：獲取 Tunnel Token
1. 訪問 https://dash.cloudflare.com/
2. 進入 **Zero Trust** → **Access** → **Tunnels**
3. 創建新的 Tunnel 或使用現有的
4. 複製 **Tunnel Token**

#### 步驟 2：配置環境變量
在 `.env` 文件中添加：
```env
CF_TUNNEL_TOKEN=your_tunnel_token_here
```

#### 步驟 3：啟用並啟動 Tunnel
```bash
# 使用 profile 啟用
docker compose --profile tunnel up -d cloudflared

# 或直接啟動（如果已配置 Token）
docker compose up -d cloudflared
```

#### 步驟 4：驗證
```bash
# 檢查狀態
docker compose ps cloudflared

# 查看日誌
docker compose logs cloudflared

# 測試連接
curl https://linebot.jytian.it.com/api/webhook/line
```

## 🔧 當前狀態

根據檢查：
- ✅ 應用正常運行（Next.js 在 9999 端口）
- ✅ Nginx 正常運行
- ✅ 本地測試成功
- ❌ Cloudflare Tunnel 未配置

## 📝 臨時測試方法

### 本地測試（無需外網）
```bash
# 測試應用
curl http://localhost:9999/api/webhook/line

# 測試 Nginx
curl http://localhost/api/webhook/line
```

### 內網測試
如果服務器有內網 IP，可以使用：
```bash
curl http://內網IP:9999/api/webhook/line
```

## 🚀 下一步

1. **如果暫時不需要外網訪問**：
   - 停止 Cloudflare Tunnel：`docker compose stop cloudflared`
   - 使用本地或內網測試

2. **如果需要外網訪問**：
   - 按照「方案 2」配置 Cloudflare Tunnel
   - 獲取 Tunnel Token
   - 添加到 `.env` 文件
   - 啟動服務：`docker compose --profile tunnel up -d cloudflared`

## 📚 詳細文檔

查看 `CLOUDFLARE_TUNNEL_SETUP.md` 獲取完整的配置指南。

