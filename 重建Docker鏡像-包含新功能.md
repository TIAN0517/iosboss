# 重建 Docker 鏡像 - 包含員工註冊功能

## 問題說明

新添加的員工註冊功能（`/register` 頁面和 `/api/auth/self-register` API）需要重新構建 Docker 鏡像才能生效。

## 解決步驟

### 1. 停止現有容器

```bash
docker compose down
```

### 2. 清理舊的構建緩存（可選，但推薦）

```bash
# 清理未使用的鏡像和構建緩存
docker system prune -a --volumes
```

### 3. 重新構建鏡像（不緩存）

```bash
# 強制重新構建，不使用緩存
docker compose build --no-cache
```

或者只重建 app 服務：

```bash
docker compose build --no-cache app
```

### 4. 啟動容器

```bash
docker compose up -d
```

### 5. 檢查日誌

```bash
# 查看 app 服務日誌
docker compose logs -f app

# 應該看到構建成功的訊息
```

### 6. 驗證新功能

訪問以下 URL 測試：

- **註冊頁面**：`http://your-domain/register`
- **註冊 API**：`http://your-domain/api/auth/self-register`

## 快速重建命令（一鍵執行）

```bash
docker compose down && \
docker compose build --no-cache app && \
docker compose up -d && \
docker compose logs -f app
```

## 驗證新文件是否被包含

在容器內檢查：

```bash
# 進入容器
docker compose exec app sh

# 檢查註冊頁面是否存在
ls -la /app/src/app/register/

# 檢查 API 路由是否存在
ls -la /app/src/app/api/auth/self-register/

# 檢查 standalone 輸出
ls -la /app/.next/standalone/app/src/app/register/
ls -la /app/.next/standalone/app/src/app/api/auth/self-register/
```

## 常見問題

### Q: 為什麼需要重新構建？

A: Next.js 在構建時會將所有源文件編譯並打包。新添加的文件只有在重新構建時才會被包含在構建輸出中。

### Q: 可以使用 `docker compose up --build` 嗎？

A: 可以，但建議使用 `--no-cache` 確保完全重新構建：

```bash
docker compose up --build --force-recreate
```

### Q: 構建時間很長怎麼辦？

A: 如果構建時間過長，可以只重建 app 服務：

```bash
docker compose build --no-cache app
docker compose up -d
```

## 注意事項

1. **數據不會丟失**：重新構建鏡像不會影響數據庫數據
2. **服務會短暫中斷**：重建期間服務會暫時不可用
3. **建議在低峰時段重建**：避免影響正常使用
