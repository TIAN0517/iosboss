# 外網 DNS 連接問題 - 最終解決方案

## 🔍 問題診斷

### 當前狀態

1. **網絡配置** ✅
   - 網絡存在：`jyt-gas-network`
   - 所有容器都在同一個網絡中
   - 容器 IP 在同一個網段（172.18.0.x）

2. **服務狀態** ✅
   - Nginx 監聽 80 端口
   - 本地服務運行正常（200）
   - Cloudflare Tunnel 已連接

3. **DNS 解析** ❌
   - **關鍵錯誤**：`lookup nginx on 127.0.0.11:53: server misbehaving`
   - Docker DNS 服務器無法解析服務名稱 `nginx`
   - HTTP 連接返回 502 Bad Gateway

---

## 🚨 根本原因

### 問題分析

**Docker DNS 服務器問題**：
- Docker 內置 DNS 服務器（127.0.0.11:53）無法解析服務名稱 `nginx`
- 這可能是因為：
  1. DNS 服務器配置問題
  2. 服務名稱註冊延遲
  3. 網絡配置不完整

**解決方案**：
- 使用容器名稱 `jyt-gas-nginx` 而不是服務名稱 `nginx`
- 或使用 IP 地址 `172.18.0.6`

---

## 🔧 解決方案

### 方案 1: 使用容器名稱（推薦）

在 Cloudflare Dashboard 中修改 Service URL：

**當前配置（不工作）**：
```
Service: http://nginx:80
```

**修改為（使用容器名稱）**：
```
Service: http://jyt-gas-nginx:80
```

**操作步驟**：
1. 登入 [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/)
2. 進入：**Zero Trust** → **Access** → **Tunnels**
3. 找到您的 Tunnel（例如：`jyt-gas-tunnel`）
4. 點擊 **Configure** → **Public Hostname**
5. 編輯 `bossai.jytian.it.com` 的配置：
   - **Service URL**：從 `http://nginx:80` 改為 `http://jyt-gas-nginx:80`
6. 保存配置
7. 等待 30 秒讓配置生效

### 方案 2: 使用 IP 地址（備選）

如果容器名稱也無法解析，使用 IP 地址：

**修改為（使用 IP 地址）**：
```
Service: http://172.18.0.6:80
```

**注意**：IP 地址可能會變化，不推薦長期使用。

---

## 📋 驗證步驟

### 步驟 1: 修改 Cloudflare Dashboard 配置

1. 訪問：https://one.dash.cloudflare.com/
2. 進入 Zero Trust → Access → Tunnels
3. 找到您的 Tunnel
4. 點擊 Configure → Public Hostname
5. 編輯 `bossai.jytian.it.com` 的配置
6. 將 Service URL 改為 `http://jyt-gas-nginx:80`
7. 保存配置

### 步驟 2: 等待配置更新

```powershell
# 等待 30 秒讓配置生效
Start-Sleep -Seconds 30
```

### 步驟 3: 檢查 Tunnel 日誌

```powershell
# 檢查日誌（應該看到配置更新和沒有 DNS 錯誤）
docker logs jyt-gas-cloudflared --tail 50 | Select-String -Pattern "Updated|error|Error|nginx"
```

應該看到：
```
INF Updated to new configuration config="{\"ingress\":[{\"hostname\":\"bossai.jytian.it.com\",\"service\":\"http://jyt-gas-nginx:80\"},...]}"
```

**不應該看到**：
```
ERR lookup nginx on 127.0.0.11:53: server misbehaving
```

### 步驟 4: 測試 HTTP 連接

```powershell
# 測試 HTTP 連接
Invoke-WebRequest -Uri "https://bossai.jytian.it.com" -Method Head
```

應該返回狀態碼 200（不是 502）

---

## ⚠️ 重要提示

### Docker 網絡 DNS 解析

在 Docker Compose 網絡中：
- **服務名稱**（如 `nginx`）應該可以解析
- **容器名稱**（如 `jyt-gas-nginx`）也可以解析
- 如果服務名稱無法解析，使用容器名稱

### Cloudflare Dashboard 配置

- **Service URL** 應該指向 Docker 內部網絡地址
- 使用 `http://` 而不是 `https://`（因為是內部網絡）
- 端口應該是 `80`（Nginx 監聽的端口）

### 為什麼使用容器名稱？

- 容器名稱是固定的（`container_name`）
- 服務名稱可能因為 DNS 配置問題無法解析
- 容器名稱在網絡中總是可用的

---

## 📝 相關文件

- `docker-compose.yml` - Docker Compose 配置
- Cloudflare Dashboard - Tunnel 配置

---

## ✅ 修復狀態

**診斷時間**：2025-12-29 10:00

**問題狀態**：🔴 發現 Docker DNS 解析問題

**解決方案**：在 Cloudflare Dashboard 中使用容器名稱而不是服務名稱

**下一步**：修改 Cloudflare Dashboard 配置並驗證
