# LINE Bot 架構清理和整合計劃

## 📋 當前問題分析

### 1. 重複的 LINE Bot 文件版本
- **production_line_bot.py**（生產版本）✅ 保留
- **intelligent_line_bot.py**（智能版本）❌ 刪除
- **complete_line_bot.py**（完整版本）❌ 刪除  
- **test_line_bot.py**（測試版本）❌ 刪除
- **boss_line_bot.py**（Boss版本）❌ 刪除
- **knowledge_line_bot.py**（知識庫版本）❌ 刪除

### 2. 重複的 API 路由端點
- `/api/webhook/line`（重複5次）→ 統一到生產版本
- `/health`（重複5次）→ 統一到生產版本  
- `/`（重複5次）→ 統一到生產版本
- `/webhook`（重複2次）→ 統一到生產版本
- `/stats`（重複2次）→ 統一到生產版本

### 3. 重複的配置文件
- **.env** 文件包含重複和衝突的配置
- **多個數據庫配置** 重複
- **多個端口配置** 混亂（5001, 5002, 8888）

## 🎯 清理目標

### 保留的唯一版本
1. **production_line_bot.py** - 生產版本（已集成真實 LINE API）
2. **app/knowledge_api.py** - 知識庫 API（獨立服務）
3. **.env** - 統一配置（清理重複）

### 刪除的文件類型
1. **重複的 LINE Bot 文件** - 5個版本只保留1個
2. **測試和開發文件** - 清理所有測試版本
3. **多餘的 HTML 文件** - 保留必要的界面文件
4. **舊的音頻文件** - 清理過多的測試音頻

### 統一的端點
- **固定 webhook URL**: `https://bossai.tiankai.it.com/api/webhook/line`
- **唯一 API 端點**: `/api/webhook/line`（生產版本）
- **健康檢查**: `/health`
- **系統信息**: `/`

## 📋 執行步驟

### 步驟 1: 備份當前版本
- 確保 production_line_bot.py 正常運行
- 備份 .env 配置

### 步驟 2: 刪除重複文件
- 刪除所有重複的 LINE Bot 文件
- 刪除測試 HTML 文件
- 清理多餘的音頻文件

### 步驟 3: 清理配置文件
- 統一 .env 文件配置
- 移除重複和衝突的設置
- 確保生產環境配置正確

### 步驟 4: 驗證功能
- 測試生產版本正常運行
- 確保知識庫 API 獨立運行
- 驗證 webhook 端點工作正常

### 步驟 5: 清理架構
- 移除未使用的文件夾和模塊
- 清理 __pycache__ 文件
- 整理項目結構

## 🔧 具體清理清單

### 刪除的文件
1. `intelligent_line_bot.py`
2. `complete_line_bot.py` 
3. `test_line_bot.py`
4. `boss_line_bot.py`
5. `knowledge_line_bot.py`
6. 測試 HTML 文件
7. 多餘的音頻文件

### 保留的文件
1. `production_line_bot.py`（生產版本）
2. `app/knowledge_api.py`（知識庫 API）
3. `.env`（統一配置）
4. 核心業務模塊

### 統一配置
1. **LINE API**: 使用真實憑證
2. **Webhook URL**: `https://bossai.tiankai.it.com/api/webhook/line`
3. **數據庫**: PostgreSQL 配置
4. **端口**: 生產版本使用 5001

## ✅ 預期結果

清理後將獲得：
- **單一版本的 LINE Bot** - 避免版本混亂
- **統一的 API 端點** - 清晰的路由結構  
- **簡潔的配置文件** - 避免配置衝突
- **清晰的項目結構** - 便於維護和開發
- **穩定的生產環境** - 確保服務穩定運行