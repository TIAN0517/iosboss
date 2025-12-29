# ⚠️ 重要：需要再次修改 Service 配置

## 🔍 當前狀態

從日誌可以看到配置已更新：
- ✅ 版本 8：`http://localhost:80`（已從 9999 改為 80）
- ❌ 但還是錯誤！需要改為 `http://nginx:80`

## 🎯 為什麼還需要修改？

### 當前配置（錯誤）
```
Service: http://localhost:80
```

**問題：**
- `localhost` 在 cloudflared 容器內指向容器自己
- cloudflared 容器內沒有運行 nginx
- 所以會出現 521 錯誤

### 正確配置
```
Service: http://nginx:80
```

**原因：**
- `nginx` 是 Docker 服務名稱
- cloudflared 和 nginx 在同一個 Docker 網絡中
- 可以通過服務名稱訪問

## 📋 修改步驟

### 1. 在 Dashboard 中找到路由
- 進入：**已發佈的應用程式路由** 頁面
- 找到：`linebot.jytian.it.com` 的路由

### 2. 編輯路由
1. 點擊路由右側的 **功能表**（三個點圖示）
2. 選擇 **編輯**（Edit）
3. 找到 **Service** 欄位

### 3. 修改 Service
**當前值：**
```
http://localhost:80
```

**改為：**
```
http://nginx:80
```

### 4. 保存
- 點擊 **保存** 或 **Save**
- 等待配置更新（通常幾秒鐘）

## ✅ 驗證

修改完成後，等待 5-10 秒，然後檢查日誌：

```bash
docker compose logs cloudflared --tail 20
```

應該看到：
```
Updated to new configuration config="...\"service\":\"http://nginx:80\"..."
```

## 🧪 測試

等待 5-10 分鐘後測試：

```bash
curl https://linebot.jytian.it.com/api/webhook/line
```

應該返回正常的 JSON 響應，而不是 521 錯誤。

## 📊 配置對比

| 配置 | 狀態 | 說明 |
|------|------|------|
| `http://localhost:9999` | ❌ 錯誤 | 端口錯誤，且 localhost 無法訪問 |
| `http://localhost:80` | ❌ 錯誤 | 端口正確，但 localhost 無法訪問 |
| `http://nginx:80` | ✅ 正確 | 使用 Docker 服務名稱，可以訪問 |

## 🎯 關鍵點

**記住：**
- ❌ 不要用 `localhost`
- ✅ 要用 `nginx`（Docker 服務名稱）
- ✅ 端口是 `80`

---

**最後更新**: 2025-12-28

