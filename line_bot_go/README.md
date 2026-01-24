# LINE Bot Go 版本 - 部署指南

## 🚀 **項目概述**

本項目是九九瓦斯行 LINE Bot 的 Go 語言版本，與 Python 版本並行運行，提供更穩定的 HTTP 標頭處理和更好的生產環境適應性。

### **核心特點**
- ✅ **雙版本並行**：Go 版本（端口 5003）+ Python 版本（端口 5001）
- ✅ **nginx 集成**：統一域名管理和負載均衡
- ✅ **無縫遷移**：漸進式從 Python 遷移到 Go
- ✅ **零停機**：同時支持兩個版本運行
- ✅ **數據庫集成**：PostgreSQL + 知識庫 API
- ✅ **生產級**：完整的錯誤處理和日誌記錄

## 📁 **項目結構**

```
line_bot_go/
├── go.mod                 # Go 模組配置
├── main.go               # 主應用程序
├── database.go           # 數據庫操作
├── knowledge.go          # 知識庫集成
├── .env                  # 環境變量
├── build_and_run.sh      # Linux/Mac 構建腳本
├── build_and_run.bat     # Windows 構建腳本
├── nginx-dual.conf       # nginx 雙版本配置
└── README.md            # 本文件
```

## 🔧 **環境要求**

- **Go**: 1.21+
- **PostgreSQL**: 13+
- **nginx**: 1.20+
- **操作系統**: Windows/Linux/macOS

## 🚀 **快速開始**

### **步驟 1: 安裝依賴**

```bash
# 安裝 Go 依賴
go mod download
go mod tidy
```

### **步驟 2: 編譯和啟動**

**Windows:**
```bash
# 運行批處理腳本
build_and_run.bat
```

**Linux/Mac:**
```bash
# 運行 Shell 腳本
chmod +x build_and_run.sh
./build_and_run.sh
```

**手動編譯:**
```bash
go build -o line-bot-go .
./line-bot-go
```

### **步驟 3: 配置環境變量**

創建 `.env` 文件：
```bash
# LINE API 憑證
LINE_CHANNEL_SECRET=f67b75f1f76dad8859df317743d8787c
LINE_CHANNEL_ACCESS_TOKEN=Zw8tNq3B4Tm83WNexjcLziVPrBrVHnkJj3pv4p9kJc+VrWfjEmBJRfdGTrbUW2lZvZBQ4MfJfz9xp8f8pJ9Uzsgcma55Rgc9hwNOap/Nrfee7l+SMvFiecAweRXOrlR3ZwD3KLaOPYIKgtAZe28nSgdB04t89/1O/w1cDnyilFU=

# 數據庫配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=Ss520520

# 其他服務
KNOWLEDGE_API_URL=http://localhost:5002/api/knowledge/search
PORT=5003
```

## 🌐 **nginx 集成配置**

### **nginx 配置文件**

將 `nginx-dual.conf` 的內容應用到 `C:\nginx\conf\conf.d\bossai.conf`：

```nginx
# 主要變更：
location /api/webhook/line {
    proxy_pass http://127.0.0.1:5003/api/webhook/line;  # 指向 Go 版本
}
```

### **nginx 重啟**
```bash
nginx -s quit
nginx
```

## 📊 **端口分配**

| 端口 | 服務 | 語言 | 狀態 |
|------|------|------|------|
| 443 | nginx HTTPS | - | ✅ 運行中 |
| 5001 | LINE Bot Python | Python | ✅ 運行中 |
| 5002 | 知識庫 API | Python | ✅ 運行中 |
| 5003 | LINE Bot Go | **Go** | 🆕 新增 |
| 9999 | 前端應用 | TypeScript/Next.js | ✅ 運行中 |

## 🔗 **API 端點**

### **Go 版本端點（端口 5003）**
- `GET /` - 系統信息
- `GET /health` - 健康檢查
- `POST /api/webhook/line` - LINE Webhook
- `GET /api/products` - 產品列表
- `GET /api/knowledge/search?q=xxx` - 知識庫搜索

### **通過 nginx 訪問**
- `https://bossai.jytian.it.com/health-go` - Go 版本健康檢查
- `https://bossai.jytian.it.com/health-python` - Python 版本健康檢查
- `https://bossai.jytian.it.com/api/go/products` - Go 版本 API
- `https://bossai.jytian.it.com/api/python/products` - Python 版本 API（備用）

## 🧪 **測試**

### **本地測試**
```bash
# 測試健康檢查
curl http://localhost:5003/health

# 測試 LINE Webhook
curl -X POST -H "Content-Type: application/json" \
     -d '{"test":"data"}' \
     http://localhost:5003/api/webhook/line
```

### **nginx 代理測試**
```bash
# 通過 nginx 測試
curl https://bossai.jytian.it.com/health-go
curl https://bossai.jytian.it.com/api/go/products
```

## 📈 **性能對比**

| 指標 | Python 版本 | Go 版本 |
|------|-------------|---------|
| 啟動時間 | ~3-5秒 | ~1秒 |
| 內存使用 | ~50-100MB | ~10-20MB |
| 標頭處理 | 可能出問題 | 穩定可靠 |
| 依賴數量 | 多（10+個） | 少（5個） |
| 部署複雜度 | 高 | 低 |

## 🔄 **漸進式遷移策略**

### **階段 1: 並存運行（當前）**
- 兩個版本同時運行
- 通過 nginx 分流流量
- 測試 Go 版本穩定性

### **階段 2: 主要流量切換**
- 將 80% 流量切換到 Go 版本
- 保持 Python 版本作為備用
- 監控性能和錯誤

### **階段 3: 完全遷移**
- 100% 流量切換到 Go 版本
- 移除 Python 版本
- 釋放端口 5001

## 🛠️ **故障排除**

### **常見問題**

#### **1. 編譯失敗**
```bash
# 檢查 Go 版本
go version

# 清理緩存
go clean -modcache
go mod tidy
```

#### **2. 端口衝突**
```bash
# 檢查端口使用
netstat -an | grep :5003

# 殺死進程
taskkill /f /im line-bot-go.exe
```

#### **3. 數據庫連接失敗**
```bash
# 測試數據庫連接
psql -h localhost -p 5432 -U postgres -d postgres
```

#### **4. nginx 配置錯誤**
```bash
# 測試 nginx 配置
nginx -t

# 查看錯誤日誌
tail -f C:\nginx\logs\bossai_error.log
```

## 📋 **監控和日誌**

### **日誌位置**
- Go 版本：`stdout`（終端輸出）
- nginx：`C:\nginx\logs\bossai_access.log`

### **健康檢查**
```bash
# 定期檢查服務狀態
while true; do
  curl -s http://localhost:5003/health | grep healthy || echo "Go version down"
  curl -s http://localhost:5001/health | grep healthy || echo "Python version down"
  sleep 30
done
```

## 🎯 **生產部署檢查清單**

- [ ] Go 環境已安裝
- [ ] 依賴已下載並編譯
- [ ] 環境變量已配置
- [ ] 數據庫連接正常
- [ ] nginx 配置已應用
- [ ] 健康檢查通過
- [ ] LINE Webhook 測試通過
- [ ] 負載均衡配置正確
- [ ] 日誌監控已設置

## 📞 **支持**

如需技術支持或遇到問題，請檢查：
1. 日誌輸出
2. nginx 錯誤日誌
3. 數據庫連接狀態
4. 網絡連接

---

**版本**: 1.0.0  
**更新日期**: 2026-01-22  
**維護者**: Jy技術團隊