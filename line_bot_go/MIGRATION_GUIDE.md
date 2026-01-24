# LINE Bot Go 版本遷移操作指南

## 🎯 **遷移狀態**
- ✅ Go 版本編譯完成：line-bot-go.exe (10MB)
- ✅ Go 版本運行中：端口 5003
- ✅ 統一數據庫配置：PostgreSQL
- ✅ 統一知識庫 API：端口 5002

## 📋 **手動 nginx 配置遷移**

### **步驟 1: 備份現有配置**
```bash
# 備份現有nginx配置
copy "C:\nginx\conf\conf.d\bossai.conf" "C:\nginx\conf\conf.d\bossai.conf.backup"
```

### **步驟 2: 應用新配置**
將以下配置完全替換到 `C:\nginx\conf\conf.d\bossai.conf`：

```nginx
server {
    listen 80;
    server_name bossai.jytian.it.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    http2 on;
    server_name bossai.jytian.it.com;

    ssl_certificate     C:/nginx/html/bossai.jytian.it.com-crt.pem;
    ssl_certificate_key C:/nginx/html/bossai.jytian.it.com-key.pem;

    access_log  C:/nginx/logs/bossai_access.log  main;
    error_log   C:/nginx/logs/bossai_error.log   warn;

    client_max_body_size 50M;
    client_body_buffer_size 128k;

    # ============================================
    # LINE Webhook - 指向 Go 版本 (端口 5003)
    # ============================================
    location /api/webhook/line {
        # Go 版本 LINE Bot (5003端口)
        proxy_pass http://127.0.0.1:5003/api/webhook/line;
        proxy_http_version 1.1;
        
        # 基礎標頭
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_set_header X-Forwarded-Port  $server_port;
        
        # LINE 簽名驗證標頭
        proxy_set_header X-Line-Signature  $http_x_line_signature;
        
        # POST 請求優化
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_buffer_size 4k;
        proxy_busy_buffers_size 8k;
        
        # 超時設置 (POST 請求專用)
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 連接優化
        proxy_set_header Connection "upgrade";
    }

    # ============================================
    # 其他端點代理
    # ============================================
    location /health {
        # 默認指向 Go 版本健康檢查 (5003端口)
        proxy_pass http://127.0.0.1:5003/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        access_log off;
    }

    location / {
        # 前端應用服務 (9999端口)
        proxy_pass http://127.0.0.1:9999;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
        proxy_buffering off;
    }
}
```

### **步驟 3: 重啟 nginx**
```bash
# 停止 nginx
C:\nginx\nginx.exe -s quit

# 重新啟動 nginx
C:\nginx\nginx.exe

# 測試配置
C:\nginx\nginx.exe -t
```

## 📊 **遷移狀態檢查**

### **當前運行服務**
- ✅ **Go LINE Bot**: 端口 5003 (目標版本)
- ✅ **Python LINE Bot**: 端口 5001 (待停用)
- ✅ **知識庫 API**: 端口 5002
- ✅ **前端應用**: 端口 9999
- ✅ **nginx**: 端口 443

### **統一數據庫配置**
- **PostgreSQL**: localhost:5432
- **知識庫 API**: http://localhost:5002/api/knowledge/search
- **共享數據**: 兩個版本使用相同數據源

## 🔍 **遷移後測試**

### **1. nginx 代理測試**
```bash
# 測試健康檢查
curl https://bossai.jytian.it.com/health

# 測試 LINE Webhook 端點
curl -X POST -H "Content-Type: application/json" \
     -d '{"test":"migration"}' \
     https://bossai.jytian.it.com/api/webhook/line
```

### **2. LINE 配置更新**
在 LINE Developers Console 中：
- **Webhook URL**: `https://bossai.jytian.it.com/api/webhook/line`
- **更新後**: 指向 Go 版本處理

### **3. 性能對比**
- **啟動時間**: Go (1秒) vs Python (3-5秒)
- **內存佔用**: Go (10-20MB) vs Python (50-100MB)
- **HTTP 標頭**: Go (穩定) vs Python (werkzeug問題)

## 🛠️ **故障排除**

### **如果 nginx 配置失敗**
```bash
# 恢復備份配置
copy "C:\nginx\conf\conf.d\bossai.conf.backup" "C:\nginx\conf\conf.d\bossai.conf"
nginx -s reload
```

### **如果 Go 版本有問題**
```bash
# 檢查 Go 版本日誌
# 在 line-bot-go.exe 終端查看輸出

# 測試 Go 版本直接訪問
curl http://localhost:5003/health
```

### **如果 Python 版本需要恢復**
```bash
# 重新啟動 Python 版本
cd "c:\Users\tian7\OneDrive\Desktop\媽媽ios\line_bot_ai"
waitress-serve --listen=*:5001 --threads=8 production_line_bot:app
```

## ✅ **遷移完成檢查清單**

- [ ] nginx 配置已更新並重啟
- [ ] LINE Webhook 指向 Go 版本
- [ ] Go 版本健康檢查通過
- [ ] 統一數據庫連接正常
- [ ] 知識庫 API 集成正常
- [ ] LINE 訊息處理測試通過
- [ ] Python 版本已停用
- [ ] 端口 5001 已釋放
- [ ] 性能監控正常

## 🎯 **遷移後優勢**

1. **穩定性**: Go 原生 HTTP 處理，無 werkzeug 問題
2. **性能**: 更快的啟動和更少的資源佔用
3. **維護性**: 單一版本，減少複雜度
4. **數據一致性**: 統一數據庫，無數據同步問題

---

**重要提醒**: 遷移前請確保 Go 版本完全穩定，再進行 Python 版本的停用。