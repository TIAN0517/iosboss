# LINE Webhook 521 錯誤 - 解決方案

## 🔍 問題確認

### LINE 平台錯誤信息
```
錯誤: webhook 回傳的 HTTP 狀態碼不是 200。 （521 未知）
Webhook URL: https://linebot.jytian.it.com/api/webhook/line
```

### 問題分析
- ✅ Webhook URL 配置正確
- ✅ 服務器服務運行正常
- ❌ **Cloudflare Tunnel 無法將請求轉發到 nginx**
- ❌ LINE 平台無法連接到服務器

## 💡 解決方案

### 方案 1：使用 IP 地址（推薦）

在 Cloudflare Dashboard 中修改 Service 配置：

**當前配置（可能不工作）：**
```
Service: http://nginx:80
```

**改為（使用 IP 地址）：**
```
Service: http://172.18.0.4:80
```

**操作步驟：**
1. 登入 [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. 進入：**Zero Trust** > **Networks** > **Tunnels**
3. 找到：`linebot-webhook-final`
4. 點擊：**Configure** 或 **Public Hostname**
5. 編輯路由配置：
   - **Hostname**: `linebot.jytian.it.com`
   - **Service**: `http://172.18.0.4:80` ← **改這裡**
6. 保存配置
7. 等待 30 秒讓配置生效

**為什麼使用 IP？**
- `172.18.0.4` 是 nginx 容器的實際 IP 地址
- 直接使用 IP 可以避免 DNS 解析問題
- Docker 網絡中的 IP 通常是穩定的

### 方案 2：驗證 nginx 配置

確認 nginx 可以處理 `/api/webhook/line` 請求：

```bash
# 測試內部訪問
docker compose exec nginx wget -qO- http://127.0.0.1:80/api/webhook/line
```

應該返回 JSON 響應或至少不是 404。

### 方案 3：檢查 Cloudflare Tunnel 日誌

修改配置後，檢查日誌確認配置已更新：

```bash
docker compose logs cloudflared --tail 30 | Select-String "Updated"
```

應該看到新的配置版本（version 10），包含 `http://172.18.0.4:80`。

## 🧪 測試步驟

### 1. 修改配置後
等待 30 秒，然後檢查：
```bash
docker compose logs cloudflared --tail 20
```

### 2. 測試外網訪問
```bash
curl https://linebot.jytian.it.com/api/webhook/line
```

應該返回 JSON 響應，而不是 521 錯誤。

### 3. 在 LINE 平台測試
1. 登入 [LINE Developers Console](https://developers.line.biz/console/)
2. 進入您的 Bot 設定
3. 找到 **Webhook 設定**
4. 點擊 **Webhook 重發**（Verify）按鈕
5. 應該顯示成功，而不是 521 錯誤

## 📋 當前配置總結

### Docker 網絡
```
Network: jyt-gas-network
├── cloudflared: 172.18.0.5
├── nginx:       172.18.0.4  ← 使用這個 IP
└── app:         172.18.0.3
```

### 服務監聽
- ✅ Nginx: `0.0.0.0:80`
- ✅ App: `0.0.0.0:9999`

### 路由配置
```
Internet
   ↓
Cloudflare Edge
   ↓
Cloudflare Tunnel (172.18.0.5)
   ↓ http://172.18.0.4:80  ← 使用 IP
Nginx (172.18.0.4:80)
   ↓ http://app:9999
App (172.18.0.3:9999)
```

## ⚠️ 注意事項

### IP 地址穩定性
- Docker 網絡中的 IP 通常是穩定的
- 但如果容器重啟，IP 可能會改變
- 如果 IP 改變，需要重新配置

### 長期解決方案
如果使用 IP 地址可以工作，但想要更穩定的配置：

1. **使用 Docker 網絡別名**
   - 在 docker-compose.yml 中配置
   - 需要重新部署

2. **檢查 cloudflared DNS 配置**
   - 確保 Docker 的內建 DNS 正常工作
   - 可能需要額外配置

## 🎯 推薦操作順序

1. **立即操作**：在 Dashboard 中將 Service 改為 `http://172.18.0.4:80`
2. **等待 30 秒**：讓配置生效
3. **測試外網訪問**：`curl https://linebot.jytian.it.com/api/webhook/line`
4. **在 LINE 平台測試**：點擊「Webhook 重發」
5. **確認成功**：應該不再出現 521 錯誤

## 📞 如果還是不行

如果使用 IP 地址後還是 521：

1. **檢查 Cloudflare Tunnel 日誌**
   ```bash
   docker compose logs cloudflared --tail 50
   ```
   查看是否有連接錯誤

2. **檢查 nginx 日誌**
   ```bash
   docker compose logs nginx --tail 50
   ```
   查看是否有請求到達

3. **重啟服務**
   ```bash
   docker compose restart cloudflared nginx
   ```

4. **清除 Cloudflare 緩存**
   - 在 Cloudflare Dashboard 中清除緩存
   - 等待幾分鐘後再次測試

---

**最後更新**: 2025-12-28
**Webhook URL**: https://linebot.jytian.it.com/api/webhook/line
**推薦方案**: 使用 IP 地址 `http://172.18.0.4:80`

