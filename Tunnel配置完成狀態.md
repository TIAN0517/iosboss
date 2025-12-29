# Cloudflare Tunnel 配置完成狀態

## ✅ 已完成

### 1. Token 配置
- ✅ 新 Token 已設置到 `.env` 文件
- ✅ Tunnel 名稱: `linebot-webhook-final`
- ✅ Token ID: `8046a360-5a60-45e4-88f9-0bd7b5d4d486`

### 2. Docker 服務
- ✅ Cloudflare Tunnel 容器已啟動
- ✅ 服務狀態: 運行中
- ✅ 連接狀態: 已註冊多個連接點
  - tpe01 (台北)
  - nrt01 (東京)
  - nrt05 (東京)

### 3. 配置版本
- ✅ 配置版本: v7
- ✅ 已更新到最新配置

## ⚠️ 需要確認

### 1. Dashboard 路由配置
**重要：** 日誌顯示配置可能指向 `http://localhost:9999`，但應該指向 `http://nginx:80`

**檢查步驟：**
1. 登入 [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. 進入：**Zero Trust** > **Networks** > **Tunnels**
3. 找到 Tunnel：`linebot-webhook-final`
4. 點擊 **Configure** 或 **Public Hostname**
5. 檢查配置：
   - **Hostname**: `linebot.jytian.it.com`
   - **Service**: 應該是 `http://nginx:80` 或 `http://nginx`
   - ❌ 如果顯示 `http://localhost:9999`，請修改為 `http://nginx:80`

### 2. 等待 Cloudflare 更新
- ⏳ 配置更新後，Cloudflare 需要 5-10 分鐘完全生效
- ⏳ 如果還是 521 錯誤，請等待更長時間

### 3. 清除緩存（可選）
如果等待後還是 521，可以在 Cloudflare Dashboard 中：
1. 進入 **Caching** > **Configuration**
2. 點擊 **Purge Everything** 清除緩存

## 🧪 測試命令

```bash
# 測試外網訪問
curl https://linebot.jytian.it.com/api/webhook/line

# 檢查 Docker 服務狀態
docker compose ps cloudflared

# 查看 Tunnel 日誌
docker compose logs cloudflared --tail 50

# 查看實時日誌
docker compose logs -f cloudflared
```

## 📊 當前狀態

```
✅ Token: 已設置
✅ Tunnel 服務: 運行中
✅ 連接狀態: 已註冊
⚠️  外網訪問: 521 錯誤（可能需要等待或調整配置）
```

## 🔧 故障排除

### 如果還是 521 錯誤：

1. **檢查 Dashboard 配置**
   - 確認 Service 指向 `nginx:80`
   - 確認 Hostname 正確

2. **等待更長時間**
   - Cloudflare 配置更新可能需要 10-15 分鐘

3. **重啟 Tunnel 服務**
   ```bash
   docker compose restart cloudflared
   ```

4. **檢查 Nginx 服務**
   ```bash
   docker compose ps nginx
   docker compose logs nginx --tail 20
   ```

5. **檢查應用服務**
   ```bash
   docker compose ps app
   docker compose logs app --tail 20
   ```

## 📝 日誌關鍵信息

```
Tunnel ID: 8046a360-5a60-45e4-88f9-0bd7b5d4d486
配置版本: v7
連接點: tpe01, nrt01, nrt05
配置: {"hostname":"linebot.jytian.it.com","service":"http://localhost:9999"}
```

**注意：** 如果配置顯示 `localhost:9999`，需要在 Dashboard 中修改為 `nginx:80`

## 🎯 下一步

1. ✅ 檢查 Cloudflare Dashboard 中的路由配置
2. ⏳ 等待 5-10 分鐘讓配置生效
3. 🧪 再次測試外網訪問
4. ✅ 如果成功，配置完成！

---

**生成時間**: 2025-12-28
**Tunnel 名稱**: linebot-webhook-final

