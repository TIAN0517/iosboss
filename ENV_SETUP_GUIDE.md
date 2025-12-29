# 九九瓦斯行管理系統 - 環境變量配置指南

## 📋 配置步驟

### 1. GLM API Key 配置（必須）

#### 獲取 GLM API Key
1. 訪問 https://open.bigmodel.cn/usercenter/apikeys
2. 登入或註冊帳號
3. 創建新的 API Key
4. 複製 API Key

#### 配置方式

**方法 1：使用 .env 文件（開發環境）**
```bash
# 在項目根目錄創建 .env 文件
GLM_API_KEY=your_api_key_here
GLM_API_KEYS=your_api_key_here
```

**方法 2：使用 docker-compose.yml（生產環境）**
```yaml
services:
  app:
    environment:
      - GLM_API_KEY=your_api_key_here
      - GLM_API_KEYS=your_api_key_here
```

**方法 3：Docker 命令行**
```bash
docker compose up -d \
  -e GLM_API_KEY=your_api_key_here \
  -e GLM_API_KEYS=your_api_key_here
```

**方法 4：環境變量文件（.env.production）**
```bash
# 創建 .env.production 文件
GLM_API_KEY=your_api_key_here
GLM_API_KEYS=your_api_key_here
```

---

### 2. 資料庫配置

#### 開發環境（使用 SQLite）
```env
DATABASE_URL="file:./prisma/dev.db"
```

#### 生產環境（使用 PostgreSQL）
```env
DATABASE_URL=postgresql://postgres:Ss520520@postgres:5432/gas_management?schema=public&connection_limit=20&pool_timeout=30
DIRECT_URL=postgresql://postgres:Ss520520@postgres:5432/gas_management
```

#### 使用外部 PostgreSQL
```env
# 替換以下信息：
# - your_host: 資料庫主機地址
# - your_port: 資料庫端口（默認 5432）
# - your_username: 資料庫用戶名
# - your_password: 資料庫密碼
# - your_database: 資料庫名稱

DATABASE_URL=postgresql://your_username:your_password@your_host:your_port/your_database?schema=public&connection_limit=20&pool_timeout=30
DIRECT_URL=postgresql://your_username:your_password@your_host:your_port/your_database
```

---

### 3. Cloudflare Tunnel 配置（可選）

#### 創建 Tunnel
1. 登入 Cloudflare Zero Trust Dashboard: https://dash.cloudflare.com/
2. 進入 **Access** → **Tunnels**
3. 點擊 **Create a tunnel**
4. 選擇 **Cloudflared** → **Docker**
5. 配置服務：
   - Service Type: HTTP
   - Service URL/Hostname: 選擇域名或使用隨機
   - Path: / (留空)
   - Service: http://app:9999 (Docker 內部網絡）
6. 複製 **Tunnel Token**

#### 配置方式
```env
CF_TUNNEL_TOKEN=your_tunnel_token_here
```

---

### 4. LINE Bot 配置（可選）

#### 創建 LINE Bot
1. 訪問 LINE Developers Console: https://developers.line.biz/
2. 創建新的 Provider 和 Channel
3. 設置 Webhook URL: `https://你的域名/api/webhook/line`
4. 複製 Channel Access Token 和 Channel Secret

#### 配置方式
```env
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
LINE_USER_ID=your_line_user_id
LINE_SKIP_SIGNATURE_VERIFY=false
```

---

### 5. 安全配置

#### JWT Secret（必須修改）
```env
# 生產環境請使用強密碼
JWT_SECRET=your_very_long_random_secret_key_here

# 生成隨機密鑰（Linux/Mac）
openssl rand -base64 32

# 生成隨機密鑰（Windows PowerShell）
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte]::new }).toCharArray())
```

#### 資料庫密碼
```env
# 生產環境請使用強密碼
POSTGRES_PASSWORD=your_strong_password_here
```

---

## 🔧 完整配置示例

### 開發環境（.env.development）
```env
NODE_ENV=development
PORT=9999

# 資料庫
DATABASE_URL="file:./prisma/dev.db"

# GLM API
GLM_API_KEY=your_dev_api_key
GLM_API_KEYS=your_dev_api_key
GLM_MODEL=glm-4-flash

# JWT
JWT_SECRET=dev-secret-key

# LINE Bot（可選）
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

### 生產環境（.env.production）
```env
NODE_ENV=production
PORT=9999

# 資料庫
DATABASE_URL=postgresql://postgres:CHANGE_ME@postgres:5432/gas_management?schema=public
POSTGRES_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# GLM API（必須配置）
GLM_API_KEY=your_production_api_key_here
GLM_API_KEYS=your_production_api_key_here
GLM_MODEL=glm-4-flash

# JWT（必須使用強密碼）
JWT_SECRET=CHANGE_ME_TO_STRONG_SECRET_KEY

# Cloudflare Tunnel（可選）
CF_TUNNEL_TOKEN=your_tunnel_token_here

# LINE Bot（可選）
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

---

## 🚀 啟動應用

### 方法 1：開發環境（本地）
```bash
# 使用開發配置
cp .env.development .env

# 安裝依賴
npm install

# 遷移資料庫
npm run db:migrate

# 填充數據
npm run db:seed

# 啟動開發服務
npm run dev
```

### 方法 2：Docker 環境（生產）
```bash
# 使用生產配置
cp .env.production .env

# 確保 GLM_API_KEY 已配置
# 確保 POSTGRES_PASSWORD 已修改為強密碼
# 確保 JWT_SECRET 已設置

# 構建並啟動
docker compose up -d --build

# 查看日誌
docker compose logs -f app
```

### 方法 3：使用環境變量啟動
```bash
docker compose up -d \
  -e GLM_API_KEY=your_key_here \
  -e POSTGRES_PASSWORD=your_password_here
```

---

## ✅ 驗證配置

### 檢查 GLM API Key
```bash
# 測試 API Key 是否有效
curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \
  -d '{
    "model": "glm-4-flash",
    "messages": [{"role": "user", "content": "你好"}],
    "max_tokens": 50
  }'
```

### 檢查資料庫連接
```bash
# PostgreSQL 連接測試
docker compose exec postgres psql -U postgres -d gas_management -c "SELECT version();"

# SQLite 連接測試
sqlite3 prisma/dev.db ".tables"
```

### 檢查應用啟動
```bash
# 檢查服務狀態
docker compose ps

# 檢查應用日誌
docker compose logs app | grep "API"

# 訪問健康檢查端點
curl http://localhost:9999/api/health
```

---

## 🔒 安全最佳實踐

### 1. 敏感信息保護
```bash
# ❌ 不要提交 .env 文件到 Git
echo ".env" >> .gitignore

# ✅ 使用 .env.example 作為範本
cp .env .env.example
# 提交 .env.example，不提交 .env
```

### 2. 強密碼生成
```bash
# 生成 32 字符的隨機密鑰
openssl rand -base64 32

# 或使用更安全的方法（推薦）
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3. 環境分離
```bash
# 開發、測試、生產使用不同的配置文件
.env.development
.env.test
.env.production

# 根據 NODE_ENV 自動加載
```

### 4. Docker Secrets（更安全）
```bash
# 使用 Docker Secrets 而不是環境變量
docker secret create glm_api_key your_api_key_here
docker secret create db_password your_password_here

# 在 docker-compose.yml 中使用
services:
  app:
    secrets:
      - glm_api_key
```

---

## 📝 快速配置檢查清單

- [ ] GLM_API_KEY 已配置（必須）
- [ ] POSTGRES_PASSWORD 已修改為強密碼（生產環境）
- [ ] JWT_SECRET 已設置為隨機字符串（生產環境）
- [ ] DATABASE_URL 正確配置
- [ ] Cloudflare Tunnel 已配置（如需外網訪問）
- [ ] LINE Bot 已配置（如需使用）
- [ ] .env 文件未提交到 Git
- [ ] 測試 API Key 連接成功
- [ ] 測試資料庫連接成功
- [ ] 應用正常啟動並可訪問

---

## 🐛 常見問題

### 問題 1：GLM API Key 無效
```
錯誤：GLM API 請求失敗: Invalid API key
解決：
1. 檢查 API Key 是否正確複製
2. 確認 API Key 未過期
3. 確認帳戶餘額充足
```

### 問題 2：資料庫連接失敗
```
錯誤：Can't reach database server
解決：
1. 確認 PostgreSQL 容器正在運行
2. 檢查 DATABASE_URL 格式是否正確
3. 檢查密碼是否正確
4. 確認網絡連接
```

### 問題 3：JWT Token 無效
```
錯誤：Invalid token
解決：
1. 檢查 JWT_SECRET 是否配置
2. 重新登入生成新 token
3. 清除瀏覽器 localStorage
```

---

## 📚 參考文檔

- [GLM API 文檔](https://open.bigmodel.cn/dev/api)
- [LINE Bot 開發文檔](https://developers.line.biz/)
- [Cloudflare Tunnel 文檔](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Docker Compose 文檔](https://docs.docker.com/compose/)

---

## 💬 需要幫助？

如遇到配置問題，請檢查：
1. 日誌：`docker compose logs app`
2. 錯誤日誌：`docker compose logs app | grep ERROR`
3. 環境變量：`docker compose exec app env`

或聯繫技術支持獲取幫助。

