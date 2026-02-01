# Ollama 完整接入指南

## 📋 目錄

1. [Ollama 簡介](#ollama-簡介)
2. [安裝 Ollama](#安裝-ollama)
3. [下載模型](#下載模型)
4. [啟動 Ollama](#啟動-ollama)
5. [接入到專案](#接入到專案)
6. [環境變量配置](#環境變量配置)
7. [清空資料庫](#清空資料庫)
8. [使用方式對比](#使用方式對比)

---

## 🚀 Ollama 簡介

### ✅ Ollama 可以在內網運行

**是的，完全可以在內網運行！**

**特點：**
- ✅ **100% 本地運行** - 不需要雲端服務
- ✅ **完全離線可用** - 下載模型後不需要網路
- ✅ **隱私安全** - 數據不會上傳到雲端
- ✅ **免費開源** - 完全免費使用
- ✅ **靈活部署** - 可部署在任何環境

**適用場景：**
- 內網環境（政府、企業）
- 隱私敏感環境（醫療、金融）
- 離線環境（無網路或網路不穩定）
- 成本敏感環境（不想付 API 費用）

---

## 📦 安裝 Ollama

### macOS 安裝

```bash
# 方法一：官方安裝腳本（最簡單）
curl -fsSL https://ollama.com/install.sh | sh

# 方法二：使用 Homebrew
brew install ollama

# 方法三：手動安裝
# 1. 下載 macOS 版本
# 2. 解壓縮到 /usr/local/bin
```

### Linux 安裝

```bash
# 方法一：官方安裝腳本
curl -fsSL https://ollama.com/install.sh | sh

# 方法二：手動安裝
# 1. 下載 Linux 版本
# 2. 解壓縮到 /usr/local/bin
# 3. 添加執行權限
chmod +x /usr/local/bin/ollama
```

### Windows 安裝

```powershell
# 方法一：官方安裝腳本（PowerShell）
iwr -useb https://ollama.com/install.ps1 | iex

# 方法二：使用 Chocolatey
choco install ollama

# 方法三：使用 WSL2（推薦）
# 在 WSL2 中安裝 Linux 版本
```

### Docker 安裝（跨平台）

```bash
# 拉取鏡像
docker pull ollama/ollama

# 運行容器
docker run -d \
  -v ollama:/root/.ollama \
  -p 11434:11434 \
  --name ollama \
  ollama/ollama

# 查看 Ollama 日誌
docker logs -f ollama
```

**Docker 優勢：**
- ✅ 環境隔離
- ✅ 易於管理和升級
- ✅ 可以限制資源使用

---

## 🤖 下載模型

安裝 Ollama 後，下載需要的模型：

### 推薦模型

#### 1. Llama 3.2（推薦）

```bash
# Llama 3.2 3B（輕量級，速度快）
ollama pull llama3.2:3b

# Llama 3.2 7B（平衡，效果好）
ollama pull llama3.2:7b

# Llama 3.2 70B（最強，但需要大內存）
ollama pull llama3.2:70b
```

#### 2. Qwen 2.5（阿里開源，中文支援好）

```bash
# Qwen 2.5 7B（推薦，中文好）
ollama pull qwen2.5:7b

# Qwen 2.5 14B
ollama pull qwen2.5:14b

# Qwen 2.5 32B
ollama pull qwen2.5:32b
```

#### 3. Mistral

```bash
# Mistral 7B
ollama pull mistral:7b

# Mistral Nemo 12B
ollama pull mistral-nemo:12b
```

#### 4. Code Llama（代碼生成）

```bash
# Code Llama 7B
ollama pull codellama:7b

# Code Llama 13B
ollama pull codellama:13b
```

### 查看已安裝的模型

```bash
# 列出所有已下載的模型
ollama list
```

### 模型選擇建議

| 電腦配置 | 推薦模型 | 說明 |
|----------|----------|------|
| 8GB RAM, 4-6 核心 | llama3.2:3b 或 qwen2.5:7b | 輕量級，速度快 |
| 16GB RAM, 8+ 核心 | llama3.2:7b 或 qwen2.5:14b | 平衡性能 |
| 32GB RAM, 12+ 核心 | llama3.2:70b 或 qwen2.5:32b | 最佳效果 |
| GPU 8GB | llama3.2:7b-q4_0 | GPU 加速 |
| GPU 16GB+ | llama3.2:70b-q4_0 | GPU 全速 |

### 模型大小對比

| 模型 | 大小（約） | RAM 需求 |
|------|-----------|---------|
| llama3.2:3b | 2GB | 4GB |
| llama3.2:7b | 4GB | 8GB |
| llama3.2:70b | 40GB | 48GB |
| qwen2.5:7b | 4.5GB | 8GB |
| qwen2.5:14b | 9GB | 16GB |

---

## ▶️ 啟動 Ollama

### 前台運行（macOS/Linux）

```bash
# 啟動 Ollama 服務
ollama serve

# 指定端口（默認 11434）
ollama serve --port 11434

# 指定模型
ollama serve --model llama3.2:7b

# 後台運行（生產環境）
nohup ollama serve > ollama.log 2>&1 &
```

### Docker 運行

```bash
# 如果沒有運行，先啟動
docker start ollama

# 查看日誌
docker logs -f ollama
```

### 測試連接

```bash
# 測試 Ollama 是否正常運行
curl http://localhost:11434/api/tags

# 測試聊天功能
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.2:7b",
  "messages": [
    {"role": "user", "content": "Hello, Ollama!"}
  ]
}'
```

### 確認運行狀態

```bash
# 查看運行的進程
ps aux | grep ollama

# 查看端口監聽
netstat -tuln | grep 11434  # Linux
lsof -i :11434              # macOS
```

---

## 🔗 接入到專案

### 環境變量配置

在專案根目錄創建或編輯 `.env` 文件：

```env
# .env

# 原有的配置
DATABASE_URL=file:./db/custom.db
ZAI_API_KEY=your_api_key_here

# 新增 Ollama 配置
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:7b
```

### 配置說明

| 變量 | 說明 | 默認值 |
|------|------|--------|
| OLLAMA_BASE_URL | Ollama 服務器地址 | http://localhost:11434 |
| OLLAMA_MODEL | 使用的模型 | llama3.2:7b |

### 專案中已準備的 Ollama 客戶端

專案已經包含了完整的 Ollama 客戶端！

**文件位置：** `/src/lib/ollama.ts`

**API 路徑：** `/api/extract-from-web-ollama`

### 前端修改（可選）

如果要使用 Ollama 而不是雲端 API，可以修改前端：

```typescript
// 在 src/app/page.tsx 中修改

// 原來的：
const response = await fetch('/api/extract-from-web', ...)

// 改為：
const response = await fetch('/api/extract-from-web-ollama', ...)
```

### 或者，同時支持兩種方式

```typescript
// 添加環境變量檢查
const USE_OLLAMA = process.env.NEXT_PUBLIC_USE_OLLAMA === 'true'

const extractApi = USE_OLLAMA 
  ? '/api/extract-from-web-ollama' 
  : '/api/extract-from-web'
```

---

## 🗄️ 清空資料庫

### SQLite 資料庫位置

**文件位置：** `/home/z/my-project/db/custom.db`

### 方法一：刪除資料庫文件（完全清空）

```bash
# 進入專案目錄
cd /home/z/my-project

# 備份資料庫（可選）
cp db/custom.db db/custom.db.backup

# 刪除資料庫文件
rm -f db/custom.db

# 重新初始化資料庫（會自動重新創建）
bun run db:push
```

### 方法二：使用 Prisma 清空資料（保留表結構）

```bash
# 使用 Prisma Studio（圖形界面）
npx prisma studio

# 在 Prisma Studio 中：
# 1. 打開 http://localhost:5555
# 2. 選擇 Store 表
# 3. 點擊每條記錄旁邊的刪除按鈕
# 4. 或者使用 SQL 語句：DELETE FROM Store;
```

### 方法三：使用 SQL 直接清空

```bash
# 使用 sqlite3 命令行
sqlite3 /home/z/my-project/db/custom.db

# 在 SQLite CLI 中：
DELETE FROM Store;
DELETE FROM PhoneNumberVerification;

# 退出
.quit
```

### 方法四：創建新的空資料庫

```bash
# 1. 重命名舊資料庫
mv db/custom.db db/custom.db.old

# 2. 重新初始化
bun run db:push

# 3. 如果新資料庫運行正常，刪除舊的
rm -f db/custom.db.old
```

### 推薦方法

**生產環境：** 方法一（刪除文件重新初始化）
**開發環境：** 方法二（Prisma Studio 圖形界面）
**快速清空：** 方法三（SQL 命令）

---

## 📊 使用方式對比

### 雲端 API vs Ollama

| 對比項 | 雲端 API（z-ai-web-dev-sdk） | Ollama（本地） |
|--------|------------------------------|---------------|
| **網路需求** | 需要網路 | 無網路也可運行 |
| **隱私性** | 數據上傳雲端 | 數據完全本地 |
| **成本** | 按次付費 | 免費（一次性下載） |
| **速度** | 快（雲端計算） | 取決於本地硬體 |
| **可靠度** | 依賴雲端服務 | 完全自主控制 |
| **配置複雜度** | 簡單（只需 API key） | 需要安裝和配置 |
| **可定制性** | 受限於提供的模型 | 可以選擇任意模型 |
| **適用環境** | 公網 | 內網/公網/離線 |
| **維護** | 雲端維護 | 自主維護 |

### 何時使用 Ollama

✅ **推薦使用 Ollama：**
- 內網環境（政府、企業）
- 隱私敏感數據（個人信息、商業機密）
- 離線或不穩定網路
- 不想支付 API 費用
- 需要離線運行
- 需要完全控制

✅ **推薦使用雲端 API：**
- 快速原型開發
- 硬體資源有限
- 不需要維護本地環境
- 需要最新最強的模型

---

## 🧪 完整部署流程

### 第一步：安裝 Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows（PowerShell）
iwr -useb https://ollama.com/install.ps1 | iex
```

### 第二步：下載模型

```bash
# 下載推薦的模型（中文支援好）
ollama pull llama3.2:7b
# 或
ollama pull qwen2.5:7b
```

### 第三步：啟動 Ollama

```bash
# 啟動服務
ollama serve

# 另一個終端測試
curl http://localhost:11434/api/tags
```

### 第四步：配置專案

```bash
# 編輯 .env 文件
nano .env

# 添加以下內容：
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:7b
```

### 第五步：測試專案

```bash
# 啟動開發服務器
bun run dev

# 在瀏覽器中測試提取功能
```

---

## 🔍 故障排除

### Ollama 無法啟動

**問題：** 端口被佔用
```bash
# 檢查端口是否被佔用
lsof -i :11434  # macOS
netstat -tuln | grep 11434  # Linux

# 殺死佔用進程
kill -9 <PID>
```

**問題：** 權限不足
```bash
# 給予執行權限
chmod +x /usr/local/bin/ollama

# 使用 sudo 運行
sudo ollama serve
```

### 模型無法下載

**問題：** 網路速度慢
```bash
# 使用鏡像站（如果可用）
# 或使用其他網路
```

**問題：** 磁盤空間不足
```bash
# 檢查磁盤空間
df -h

# 清理舊模型
ollama rm <model_name>

# 查看 Ollama 數據目錄大小
du -sh ~/.ollama
```

### 提取失敗

**問題：** 無法連接 Ollama
```bash
# 檢查 Ollama 是否運行
curl http://localhost:11434/api/tags

# 檢查 .env 配置
cat .env | grep OLLAMA

# 查看瀏覽器控制台錯誤信息
```

**問題：** 提取結果不準確
```bash
# 嘗試更大的模型
ollama pull llama3.2:70b

# 或更專門的模型
ollama pull qwen2.5:14b

# 調整溫度參數（在 .env 中）
OLLAMA_TEMPERATURE=0.1  # 更精確
```

---

## 📚 參考資源

### 官方資源

- **Ollama 官網：** https://ollama.com
- **GitHub 倉庫：** https://github.com/ollama/ollama
- **文檔：** https://github.com/ollama/ollama/blob/main/docs/README.md
- **模型庫：** https://ollama.com/library

### 模型比較

- **Llama 3：** Meta 最新的開源 LLM
- **Qwen：** 阿里巴巴開源，中文支援好
- **Mistral：** 法國 AI 公司，品質優秀
- **Code Llama：** 專注於代碼生成

---

## 🎉 總結

### Ollama 的優勢

✅ **完全離線可用** - 下載模型後不需要網路
✅ **隱私安全** - 所有數據在本地處理
✅ **免費使用** - 一次性下載，無限次使用
✅ **靈活部署** - 可以部署在任何環境
✅ **可定制** - 選擇最適合的模型
✅ **持續更新** - 社區活躍，模型不斷改進

### 專案支持

專案已經完全支持 Ollama：

✅ **完整的 Ollama 客戶端** (`/src/lib/ollama.ts`)
✅ **專用的 API 路徑** (`/api/extract-from-web-ollama`)
✅ **連接測試** - 自動測試 Ollama 連接
✅ **錯誤處理** - 詳細的錯誤信息
✅ **環境配置** - 支持通過 .env 配置

### 快速開始

```bash
# 1. 安裝 Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. 下載模型
ollama pull llama3.2:7b

# 3. 啟動服務
ollama serve

# 4. 配置專案（編輯 .env）
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:7b

# 5. 測試
bun run dev
```

---

## 💡 最佳實踐

### 內網環境

1. **提前下載模型** - 在有網路時下載好所有需要的模型
2. **本地模型倉庫** - 備份模型文件到內網服務器
3. **Docker 部署** - 使用 Docker 統一部署環境

### 生產環境

1. **後台運行** - 使用 `nohup` 或 `systemd` 後台運行
2. **日誌記錄** - 保存日誌到文件
3. **監控服務** - 使用監控工具確保服務穩定運行
4. **資源限制** - 配置 CPU/內存/GPU 使用限制

### 性能優化

1. **選擇合適的模型** - 不要總是使用最大的模型
2. **調整溫度** - 使用 0.1-0.3 提高精確度
3. **優化提示詞** - 使用精簡明確的提示詞
4. **批量處理** - 合理控制並發請求數量

---

**準備開始使用 Ollama！** 🚀

有任何問題或需要進一步的幫助，請隨時告訴我！
