# 九九瓦斯行 - 公司內網部署指南

## 前置準備

### 需要的資訊（請問公司 IT）

請複製這段問題：

```
請提供川紀系統的 MSSQL 連線資訊：

1. 資料庫伺服器 IP：______________
2. 資料庫端口（預設 1433）：______________
3. 資料庫名稱：______________
4. 唯讀帳號：______________
5. 密碼：______________
```

---

## 安裝步驟

### 步驟 1：安裝 Docker

1. 下載 Docker Desktop for Windows
   - 網址：https://www.docker.com/products/docker-desktop/
2. 安裝並重啟電腦
3. 啟動 Docker Desktop

### 步驟 2：複製專案

將整個 `媽媽ios` 資料夾複製到目標電腦，例如：
```
C:\九九瓦斯系統\
```

### 步驟 3：修改 .env 檔案

編輯 `C:\九九瓦斯系統\.env`，填入川紀資訊：

```bash
# 川紀 MSSQL 配置
CJ_ENABLED="true"
CJ_MSSQL_HOST="192.168.x.x"           # 填入川紀DB的IP
CJ_MSSQL_PORT="1433"
CJ_MSSQL_DATABASE="ChuanjiDB"          # 填入資料庫名稱
CJ_MSSQL_USER="readonly"               # 填入帳號
CJ_MSSQL_PASSWORD="你的密碼"           # 填入密碼
CJ_MSSQL_ENCRYPT="false"
CJ_MSSQL_TRUST_CERT="true"
```

### 步驟 4：啟動系統

1. 開啟命令提示字元（CMD）
2. 進入專案目錄：
```bash
cd C:\九九瓦斯系統
```
3. 啟動 Docker：
```bash
docker-compose up -d
```

### 步驟 5：設定開機自動啟動

在 Docker Desktop 中：
1. 點選右上角設定圖示 ⚙️
2. General → 勾選「Start Docker Desktop when you sign in to Windows」

---

## 使用方式

### 員工訪問系統

在公司內網任意電腦瀏覽器開啟：
```
http://那台電腦的IP:9999
```

例如：
```
http://192.168.1.100:9999
```

### 查詢本機 IP

在部署電腦上：
1. Win + R
2. 輸入 `cmd`
3. 輸入 `ipconfig`
4. 找到「IPv4 位址」，例如 `192.168.1.100`

### 查詢川紀客戶

1. 進入「客戶管理」
2. 點「新增客戶」
3. 輸入電話號碼
4. 點擊旁邊的 🗄️ 圖示
5. 系統會從川紀查詢並自動填入資料

---

## 常用指令

```bash
# 查看運行狀態
docker-compose ps

# 查看日誌
docker-compose logs -f app

# 停止系統
docker-compose down

# 重啟系統
docker-compose restart

# 更新系統（修改代碼後）
docker-compose up -d --build
```

---

## 故障排除

### 無法連接川紀資料庫

1. 檢查 IP 是否正確
2. 檢查防火牆是否阻擋 1433 port
3. 確認 MSSQL 允許遠端連接

### 系統無法啟動

```bash
# 查看錯誤日誌
docker-compose logs app
```

### 員工無法訪問

1. 確認部署電腦沒有關機
2. 確認 Docker 正在運行
3. 檢查防火牆設定

---

## 聯絡資訊

技術支援：Jy技術團隊
