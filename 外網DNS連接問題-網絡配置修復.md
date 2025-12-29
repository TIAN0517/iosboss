# 外網 DNS 連接問題 - 網絡配置修復

## 🔍 問題診斷

### 關鍵發現

1. **網絡配置問題** ❌
   - `docker-compose.yml` 中網絡配置為 `external: true`
   - 但實際網絡 `jyt-gas-network` 不存在
   - 錯誤：`network jyt-network not found`

2. **容器狀態** ✅
   - 所有容器都在運行
   - 容器 IP 在同一個網段（172.18.0.x）
   - 說明容器可能在使用默認網絡

3. **DNS 解析失敗** ❌
   - Tunnel 無法解析 `nginx` 主機名
   - 錯誤：`lookup nginx on 127.0.0.11:53: server misbehaving`

4. **HTTP 連接** ❌
   - 返回 502 Bad Gateway
   - Tunnel 無法連接到 Nginx

---

## 🚨 根本原因

### 問題分析

**網絡配置錯誤**：
```yaml
networks:
  jyt-network:
    name: jyt-gas-network
    external: true  # ❌ 問題：外部網絡不存在
```

**影響**：
- Docker Compose 期望使用外部網絡 `jyt-gas-network`
- 但該網絡不存在
- 容器可能回退到默認網絡
- 默認網絡可能沒有正確的 DNS 配置
- 導致服務名稱無法解析

---

## 🔧 解決方案

### 修復 1: 改為自動創建網絡（已修復）

**修改前**：
```yaml
networks:
  jyt-network:
    name: jyt-gas-network
    external: true  # 外部網絡，需要手動創建
```

**修改後**：
```yaml
networks:
  jyt-network:
    name: jyt-gas-network
    driver: bridge  # 自動創建橋接網絡
    # external: true  # 已移除
```

**好處**：
- Docker Compose 會自動創建網絡
- 網絡會正確配置 DNS
- 服務名稱可以正常解析

---

## 📋 驗證步驟

### 步驟 1: 重新創建網絡和容器

```powershell
# 停止所有服務
docker-compose down

# 刪除舊網絡（如果存在）
docker network rm jyt-gas-network 2>&1 | Out-Null

# 重新創建網絡和容器
docker-compose up -d

# 等待服務啟動（約 30 秒）
Start-Sleep -Seconds 30
```

### 步驟 2: 檢查網絡配置

```powershell
# 檢查網絡是否存在
docker network ls | Select-String "jyt-gas-network"

# 檢查網絡中的容器
docker network inspect jyt-gas-network --format "{{range .Containers}}{{.Name}} {{end}}"
```

應該看到：
- `jyt-gas-app`
- `jyt-gas-nginx`
- `jyt-gas-cloudflared`
- `jyt-gas-postgres`

### 步驟 3: 檢查容器 IP

```powershell
# 檢查 Nginx 容器 IP
docker inspect jyt-gas-nginx --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"

# 檢查 Cloudflared 容器 IP
docker inspect jyt-gas-cloudflared --format "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}"
```

應該在同一個網段（例如：172.18.0.x）

### 步驟 4: 檢查 Cloudflare Tunnel 日誌

```powershell
# 檢查日誌（應該沒有 DNS 錯誤）
docker logs jyt-gas-cloudflared --tail 50 | Select-String -Pattern "error|Error|ERROR|nginx|Updated"
```

應該看到：
- 配置已更新
- 沒有 DNS 解析錯誤
- 連接成功

### 步驟 5: 測試 HTTP 連接

```powershell
# 測試 HTTP 連接
Invoke-WebRequest -Uri "https://bossai.jytian.it.com" -Method Head
```

應該返回狀態碼 200（不是 502）

---

## ⚠️ 重要提示

### Docker 網絡類型

- **bridge**：默認網絡類型，適合單機部署
- **external**：使用外部網絡，需要手動創建
- **overlay**：用於 Docker Swarm 多主機部署

**對於單機部署**：
- 使用 `driver: bridge`（自動創建）
- 不需要 `external: true`

### 服務名稱解析

在 Docker Compose 網絡中：
- **服務名稱**（如 `nginx`）應該可以解析
- **容器名稱**（如 `jyt-gas-nginx`）也可以解析
- 如果無法解析，檢查網絡配置

### Cloudflare Dashboard 配置

即使修復了網絡配置，Cloudflare Dashboard 中的 Service URL 仍然應該是：
- `http://nginx:80`（使用服務名稱）
- 或 `http://jyt-gas-nginx:80`（使用容器名稱）

---

## 📝 相關文件

- `docker-compose.yml` - Docker Compose 配置（已修復）
- Cloudflare Dashboard - Tunnel 配置

---

## ✅ 修復狀態

**修復時間**：2025-12-29 09:55

**修復狀態**：✅ 已修復網絡配置

**下一步**：重新創建網絡和容器並驗證
