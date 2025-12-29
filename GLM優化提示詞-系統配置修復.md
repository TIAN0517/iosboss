# GLM-4.7 系統配置優化提示詞

## 🎯 任務目標

優化九九瓦斯行管理系統的 Docker 配置，修復環境變數缺失、健康檢查問題和配置不一致等問題。

---

## 📋 當前問題清單

### 🔴 高優先級問題

#### 問題 1：LINE Group IDs 環境變數缺失
**位置**：`docker-compose.yml` 第 50-54 行（LINE Bot 配置區塊）

**問題描述**：
- `.env.docker` 文件中定義了 `LINE_ADMIN_GROUP_ID`、`LINE_DRIVER_GROUP_ID`、`LINE_SALES_GROUP_ID`
- 但 `docker-compose.yml` 的 `app` 服務 `environment` 區塊中沒有這些變數
- 代碼中多處使用這些變數（`src/app/api/webhook/line/route.ts`、`src/lib/line-group-manager.ts` 等）
- 容器內環境變數檢查確認這些變數不存在

**需要修復**：
在 `docker-compose.yml` 的 `app` 服務 `environment` 區塊中，在 `LINE_SKIP_SIGNATURE_VERIFY` 之後添加：
```yaml
      - LINE_ADMIN_GROUP_ID=${LINE_ADMIN_GROUP_ID:-}
      - LINE_DRIVER_GROUP_ID=${LINE_DRIVER_GROUP_ID:-}
      - LINE_SALES_GROUP_ID=${LINE_SALES_GROUP_ID:-}
```

#### 問題 2：Cloudflared 健康檢查配置錯誤
**位置**：`docker-compose.yml` 第 233-238 行（cloudflared 服務的 healthcheck 區塊）

**問題描述**：
- 當前健康檢查使用 `wget` 命令，但 `cloudflare/cloudflared:latest` 鏡像可能沒有 `wget`
- 容器狀態顯示為 `unhealthy`
- 日誌顯示連接正常，但健康檢查失敗

**需要修復**：
將健康檢查改為使用 `curl` 或 cloudflared 內建命令：
```yaml
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://127.0.0.1:2000/metrics || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

---

### 🟡 中優先級問題

#### 問題 3：重啟策略不一致
**位置**：`docker-compose.yml` 各服務的 `restart` 配置

**問題描述**：
- `app` 服務：`restart: unless-stopped`（第 17 行）
- `postgres` 服務：`restart: unless-stopped`（第 125 行）
- `nginx` 服務：`restart: unless-stopped`（第 203 行）
- `cloudflared` 服務：`restart: always`（第 249 行）
- `backup` 服務：`restart: unless-stopped`（第 292 行）

**需要修復**：
為確保持久性，將所有服務的 `restart` 策略統一改為 `always`：
- `app` 服務第 17 行：`restart: always`
- `postgres` 服務第 125 行：`restart: always`
- `nginx` 服務第 203 行：`restart: always`
- `backup` 服務第 292 行：`restart: always`
- `cloudflared` 服務第 249 行：保持 `restart: always`（已正確）

---

### 🟢 低優先級問題（可選優化）

#### 問題 4：其他環境變數完整性檢查
**位置**：`docker-compose.yml` 的 `app` 服務 `environment` 區塊

**問題描述**：
`.env.docker` 中定義了以下變數，但 `docker-compose.yml` 中可能缺失：
- `DISPATCH_AUTO_ASSIGN_ENABLED`
- `DISPATCH_AUTO_ASSIGN_RADIUS`
- `DRIVER_LOCATION_TRACKING_ENABLED`
- `DRIVER_LOCATION_UPDATE_INTERVAL`
- `DRIVER_LOCATION_RETENTION_DAYS`
- `DRIVER_APP_NOTIFICATION_ENABLED`
- `DRIVER_APP_SMS_NOTIFICATION_ENABLED`
- `VEHICLE_EXPRESS_ENABLED`
- `VEHICLE_EXPRESS_SMS_ENABLED`
- `VEHICLE_EXPRESS_SENDER_ID`
- `VEHICLE_EXPRESS_SMS_USERNAME`
- `VEHICLE_EXPRESS_SMS_PASSWORD`
- `VEHICLE_EXPRESS_SMS_ON_WAY`
- `VEHICLE_EXPRESS_SMS_ARRIVED`
- `VEHICLE_EXPRESS_SMS_COMPLETED`
- `VEHICLE_EXPRESS_TRACKING_ENABLED`
- `VEHICLE_EXPRESS_TRACKING_INTERVAL`
- `ACCOUNTING_SYNC_ENABLED`
- `ACCOUNTING_SYNC_API_KEY`
- `ACCOUNTING_SYNC_API_URL`
- `ACCOUNTING_SYNC_INTERVAL`
- `MIN_STOCK_ALERT_LEVEL`
- `WEBHOOK_TIMEOUT`
- `WEBHOOK_RETRY_COUNT`
- `WEBHOOK_SIGNATURE_SECRET`
- `GLM_STT_MODEL`
- `GLM_TTS_MODEL`
- `TTS_VOICE`
- `TTS_SPEED`
- `TTS_PITCH`

**需要修復**：
1. 檢查代碼中是否使用這些變數（使用 `grep` 搜索 `process.env.變數名`）
2. 如果代碼中使用，則在 `docker-compose.yml` 中添加對應的環境變數定義
3. 如果代碼中未使用，可以忽略或標記為可選

**建議格式**：
```yaml
      # 配送管理
      - DISPATCH_AUTO_ASSIGN_ENABLED=${DISPATCH_AUTO_ASSIGN_ENABLED:-false}
      - DISPATCH_AUTO_ASSIGN_RADIUS=${DISPATCH_AUTO_ASSIGN_RADIUS:-10}
      
      # 司機位置追蹤
      - DRIVER_LOCATION_TRACKING_ENABLED=${DRIVER_LOCATION_TRACKING_ENABLED:-true}
      - DRIVER_LOCATION_UPDATE_INTERVAL=${DRIVER_LOCATION_UPDATE_INTERVAL:-30}
      - DRIVER_LOCATION_RETENTION_DAYS=${DRIVER_LOCATION_RETENTION_DAYS:-90}
      
      # 司機應用通知
      - DRIVER_APP_NOTIFICATION_ENABLED=${DRIVER_APP_NOTIFICATION_ENABLED:-true}
      - DRIVER_APP_SMS_NOTIFICATION_ENABLED=${DRIVER_APP_SMS_NOTIFICATION_ENABLED:-true}
      
      # 車輛快遞服務
      - VEHICLE_EXPRESS_ENABLED=${VEHICLE_EXPRESS_ENABLED:-true}
      - VEHICLE_EXPRESS_SMS_ENABLED=${VEHICLE_EXPRESS_SMS_ENABLED:-true}
      - VEHICLE_EXPRESS_SENDER_ID=${VEHICLE_EXPRESS_SENDER_ID:-JY99GAS}
      - VEHICLE_EXPRESS_SMS_USERNAME=${VEHICLE_EXPRESS_SMS_USERNAME:-}
      - VEHICLE_EXPRESS_SMS_PASSWORD=${VEHICLE_EXPRESS_SMS_PASSWORD:-}
      - VEHICLE_EXPRESS_SMS_ON_WAY=${VEHICLE_EXPRESS_SMS_ON_WAY:-}
      - VEHICLE_EXPRESS_SMS_ARRIVED=${VEHICLE_EXPRESS_SMS_ARRIVED:-}
      - VEHICLE_EXPRESS_SMS_COMPLETED=${VEHICLE_EXPRESS_SMS_COMPLETED:-}
      - VEHICLE_EXPRESS_TRACKING_ENABLED=${VEHICLE_EXPRESS_TRACKING_ENABLED:-true}
      - VEHICLE_EXPRESS_TRACKING_INTERVAL=${VEHICLE_EXPRESS_TRACKING_INTERVAL:-300}
      
      # 會計同步
      - ACCOUNTING_SYNC_ENABLED=${ACCOUNTING_SYNC_ENABLED:-false}
      - ACCOUNTING_SYNC_API_KEY=${ACCOUNTING_SYNC_API_KEY:-}
      - ACCOUNTING_SYNC_API_URL=${ACCOUNTING_SYNC_API_URL:-}
      - ACCOUNTING_SYNC_INTERVAL=${ACCOUNTING_SYNC_INTERVAL:-3600}
      
      # 庫存管理
      - MIN_STOCK_ALERT_LEVEL=${MIN_STOCK_ALERT_LEVEL:-10}
      
      # Webhook 配置
      - WEBHOOK_TIMEOUT=${WEBHOOK_TIMEOUT:-30000}
      - WEBHOOK_RETRY_COUNT=${WEBHOOK_RETRY_COUNT:-3}
      - WEBHOOK_SIGNATURE_SECRET=${WEBHOOK_SIGNATURE_SECRET:-}
      
      # GLM 語音服務
      - GLM_STT_MODEL=${GLM_STT_MODEL:-glm-4v}
      - GLM_TTS_MODEL=${GLM_TTS_MODEL:-tts-1}
      - TTS_VOICE=${TTS_VOICE:-zh-cn-female-standard}
      - TTS_SPEED=${TTS_SPEED:-1.0}
      - TTS_PITCH=${TTS_PITCH:-1.0}
```

---

## 🔧 修復步驟

### 步驟 1：修復 LINE Group IDs（必須）
1. 打開 `docker-compose.yml`
2. 找到 `app` 服務的 `environment` 區塊（約第 22-82 行）
3. 在 `LINE_SKIP_SIGNATURE_VERIFY` 之後（約第 54 行後）添加三個 LINE Group ID 環境變數
4. 保存文件

### 步驟 2：修復 Cloudflared 健康檢查（必須）
1. 打開 `docker-compose.yml`
2. 找到 `cloudflared` 服務的 `healthcheck` 區塊（約第 233-238 行）
3. 將 `test` 命令從 `wget` 改為 `curl`
4. 保存文件

### 步驟 3：統一重啟策略（建議）
1. 打開 `docker-compose.yml`
2. 找到所有服務的 `restart` 配置：
   - `app` 服務第 17 行
   - `postgres` 服務第 125 行
   - `nginx` 服務第 203 行
   - `backup` 服務第 292 行
3. 將所有 `restart: unless-stopped` 改為 `restart: always`
4. 保存文件

### 步驟 4：添加其他環境變數（可選）
1. 使用 `grep` 檢查代碼中是否使用上述環境變數
2. 如果使用，在 `docker-compose.yml` 的 `app` 服務 `environment` 區塊中添加
3. 按照功能分組，添加註釋說明
4. 保存文件

---

## ✅ 驗證步驟

修復完成後，執行以下命令驗證：

```bash
# 1. 驗證 docker-compose.yml 語法
docker compose config

# 2. 重新啟動服務
docker compose down
docker compose up -d

# 3. 檢查容器狀態
docker compose ps

# 4. 檢查 app 容器環境變數
docker exec jyt-gas-app printenv | grep LINE_

# 5. 檢查 cloudflared 健康狀態
docker compose ps cloudflared

# 6. 查看 cloudflared 日誌
docker compose logs cloudflared --tail 20
```

---

## 📝 注意事項

1. **備份**：修改前請備份 `docker-compose.yml` 文件
2. **測試**：每次修改後都要測試服務是否正常啟動
3. **環境變數**：確保 `.env.docker` 文件中有對應的值
4. **格式**：保持 YAML 縮進一致（使用 2 個空格）
5. **註釋**：添加環境變數時，建議添加註釋說明用途

---

## 🎯 預期結果

修復完成後應該：
- ✅ 所有容器狀態為 `healthy`
- ✅ `app` 容器中包含所有必要的環境變數
- ✅ `cloudflared` 容器健康檢查通過
- ✅ 所有服務重啟策略統一為 `always`
- ✅ LINE 群組功能正常工作
- ✅ 系統配置完整且一致

---

## 💡 提示

- 如果某個環境變數在代碼中未使用，可以暫時不添加
- 優先處理高優先級問題，低優先級問題可以分批處理
- 修改後記得重啟服務以應用新配置
- 建議使用版本控制（Git）追蹤配置變更
