# Nginx SSL 配置完整指南

## 📋 準備工作

### 1. 確認 Nginx 安裝
```bash
# 檢查 Nginx 版本
nginx -v

# Windows: 通常安裝在 C:\nginx
# Linux: /etc/nginx
```

### 2. 創建必要目錄
```bash
# Windows
mkdir C:\nginx\logs
mkdir C:\nginx\html\certbot

# Linux
sudo mkdir -p /var/www/certbot
sudo mkdir -p /var/log/nginx
```

### 3. 安裝 Certbot (Let's Encrypt)

#### Windows:
```bash
# 下載 Certbot
# https://certbot.eff.org/docs/install.html#id1

# 使用 Win-ACME
# https://github.com/win-acme/win-acme
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
```

---

## 🔧 步驟 1：配置 HTTP (80) - 獲取 SSL 證書

### 創建 HTTP 配置文件

```nginx
# Windows: C:\nginx\conf\ai-http.conf
# Linux: /etc/nginx/sites-available/ai-http.conf

server {
    listen 80;
    listen [::]:80;
    server_name ai.tiankai.it.com;

    # Let's Encrypt ACME Challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;  # Windows: C:/nginx/html/certbot
    }

    # 其他請求重定向到 HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}
```

### 應用 HTTP 配置
```bash
# Windows: 將配置文件放在 conf.d 目錄
copy nginx-http-80.conf C:\nginx\conf\ai-http.conf

# Linux
sudo cp ai-http.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/ai-http.conf /etc/nginx/sites-enabled/
```

### 測試 HTTP 配置
```bash
# 測試 Nginx 配置
nginx -t

# 重啟 Nginx
# Windows
nginx -s reload

# Linux
sudo systemctl reload nginx
```

### 測試 HTTP 訪問
訪問：http://ai.tiankai.it.com
應該看到重定向到 HTTPS

---

## 🔐 步驟 2：獲取 SSL 證書

### 方案 A：使用 Let's Encrypt (免費，推薦)

#### Linux:
```bash
sudo certbot certonly --webroot -w /var/www/certbot -d ai.tiankai.it.com
```

#### Windows:
使用 Win-ACME 或手動獲取證書

### 方案 B：使用 Cloudflare Origin Certificate (推薦)

#### 步驟 1：登入 Cloudflare Dashboard
1. 訪問 https://dash.cloudflare.com
2. 選擇您的域名：`tiankai.it.com`
3. 點擊 **SSL/TLS** → **Origin Server**

#### 步驟 2：創建 Origin Certificate
1. 點擊 **"Create Certificate"**
2. 選擇 **"Create Private Key and CSR with Cloudflare"**
3. 主機名：`ai.tiankai.it.com`
4. 有效期：15 年（推薦）
5. 點擊 **"Create"**

#### 步驟 3：下載證書
會獲得兩個文件：
- `origin.pem` (證書)
- `origin.key` (私鑰)

#### 步驟 4：保存證書
```bash
# Windows
copy origin.pem C:\nginx\html\ai.tiankai.it.com-crt.pem
copy origin.key C:\nginx\html\ai.tiankai.it.com-key.pem

# Linux
sudo cp origin.pem /etc/nginx/ssl/ai.tiankai.it.com-crt.pem
sudo cp origin.key /etc/nginx/ssl/ai.tiankai.it.com-key.pem
```

---

## 🔒 步驟 3：配置 HTTPS (443) - 反向代理

### 創建 HTTPS 配置文件

```nginx
# Windows: C:\nginx\conf\ai-https.conf
# Linux: /etc/nginx/sites-available/ai-https.conf

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ai.tiankai.it.com;

    # SSL 證書配置
    ssl_certificate     C:/nginx/html/ai.tiankai.it.com-crt.pem;  # Linux: /etc/nginx/ssl/ai.tiankai.it.com-crt.pem
    ssl_certificate_key C:/nginx/html/ai.tiankai.it.com-key.pem;  # Linux: /etc/nginx/ssl/ai.tiankai.it.com-key.pem

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 日誌
    access_log C:/nginx/logs/ai-access.log;  # Linux: /var/log/nginx/ai-access.log
    error_log C:/nginx/logs/ai-error.log;   # Linux: /var/log/nginx/ai-error.log

    # 反向代理到本地 Ollama
    location / {
        proxy_pass http://127.0.0.1:11434;
        proxy_http_version 1.1;

        # 代理頭
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 流式響應必須（關鍵！）
        proxy_buffering off;

        # 避免長任務斷線（60 分鐘）
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 3600s;

        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # 健康檢查端點
    location /health {
        access_log off;
        return 200 "healthy";
        add_header Content-Type text/plain;
    }
}
```

### 應用 HTTPS 配置
```bash
# 測試 Nginx 配置
nginx -t

# 重啟 Nginx
# Windows
nginx -s reload

# Linux
sudo systemctl reload nginx
```

---

## 🌐 步驟 4：配置 Cloudflare CDN

### DNS 設置

1. **登入 Cloudflare Dashboard**
   訪問：https://dash.cloudflare.com

2. **選擇域名**
   點擊 `tiankai.it.com`

3. **添加 DNS 記錄**
   - **Type**: CNAME
   - **Name**: `ai`
   - **Target**: 您的服務器 IP（或另一個 CNAME）
   - **Proxy status**: Proxied (橙色雲朵) ✅
   - **TTL**: Auto
   - **Save**

4. **確認 DNS 生效**
   等待幾分鐘，DNS 記錄會生效

### SSL/TLS 設置

1. **進入 SSL/TLS 頁面**
2. **設置加密模式**：
   - 選擇 **Full (strict)** ✅

3. **啟用 Always Use HTTPS**：
   - 打開 **Edge Certificates**
   - 點擊 **Always Use HTTPS** → **ON**

4. **啟用 Automatic HTTPS Rewrites**：
   - 打開 **Edge Certificates**
   - 點擊 **Automatic HTTPS Rewrites** → **ON**

### Page Rules (可選，優化性能)

1. **添加 Page Rule**
   - **URL Pattern**: `ai.tiankai.it.com/*`
   - **Settings**:
     - Cache Level: Standard
     - Edge Cache TTL: 2 hours
   - **Save and Deploy**

---

## ✅ 測試配置

### 1. 測試 HTTP → HTTPS 重定向
```bash
curl -I http://ai.tiankai.it.com
# 應該返回 301 Redirect 到 HTTPS
```

### 2. 測試 HTTPS 訪問
```bash
curl https://ai.tiankai.it.com
# 應該可以訪問
```

### 3. 測試 AI API
```bash
# 測試 Ollama API
curl https://ai.tiankai.it.com/api/tags

# 測試生成
curl -X POST https://ai.tiankai.it.com/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "dolphin-llama3", "prompt": "Hello"}'
```

### 4. 測試健康檢查
```bash
curl https://ai.tiankai.it.com/health
# 應該返回 "healthy"
```

---

## 📝 更新 Netlify 環境變量

配置好 SSL 後，更新 Netlify 環境變量：

```bash
AI_BASE_URL=https://ai.tiankai.it.com
OLLAMA_BASE_URL=https://ai.tiankai.it.com
```

### 在 Netlify Dashboard：
1. Site configuration → Environment variables
2. 添加：
   - `AI_BASE_URL`: `https://ai.tiankai.it.com`
   - `OLLAMA_BASE_URL`: `https://ai.tiankai.it.com`
3. 重新部署

---

## 🔒 安全提醒

### SSL 證書自動續期

#### Let's Encrypt:
```bash
# 設置自動續期（Linux）
sudo crontab -e
# 添加：
0 3 * * * /usr/bin/certbot renew --quiet
```

#### Cloudflare Origin Certificate:
- 有效期 15 年
- 到期前 30 天提醒更新

### 訪問控制

添加 Nginx 訪問限制（可選）：

```nginx
# 只允許特定 IP 訪問
allow 1.2.3.4;
allow 5.6.7.8;
deny all;

# 或者添加密碼保護
auth_basic "Restricted Access";
auth_basic_user_file C:/nginx/.htpasswd;  # Linux: /etc/nginx/.htpasswd
```

---

## 🎉 完成後

配置成功後：
- ✅ `http://ai.tiankai.it.com` 自動重定向到 HTTPS
- ✅ `https://ai.tiankai.it.com` 可以訪問
- ✅ 通過 Cloudflare CDN 加速
- ✅ SSL 證書自動配置
- ✅ 反向代理到本地 Ollama
- ✅ Netlify 可以通過 `https://ai.tiankai.it.com` 訪問本地 AI

---

## 📞 故障排除

### 問題 1：SSL 證書錯誤
**解決方案**：
- 檢查證書路徑是否正確
- 確認證書文件權限
- 檢查 Nginx 配置語法

### 問題 2：無法訪問 AI
**解決方案**：
- 確認 Ollama 正在運行（`http://localhost:11434`）
- 檢查 Nginx 日誌
- 檢查防火牆設置

### 問題 3：連接超時
**解決方案**：
- 增加 `proxy_read_timeout`
- 檢查網絡連接
- 檢查 Ollama 日誌

---

## 📚 參考資源

- Nginx 官方文檔：https://nginx.org/en/docs/
- Let's Encrypt：https://letsencrypt.org/
- Cloudflare 文檔：https://developers.cloudflare.com/
- Certbot：https://certbot.eff.org/
