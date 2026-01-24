# 免費部署方案 - 本地優先架構

## 📋 架構說明

### 本地為主（Master）
- ✅ 本地 PostgreSQL 是主數據庫
- ✅ 所有寫入操作都在本地
- ✅ 本地關機時，雲端只能讀取舊數據

### 雲端為輔（Backup/Read-Only）
- ✅ Vercel 部署前端（免費）
- ✅ Supabase 免費版只存備份（500MB）
- ✅ 定期從本地同步備份到雲端
- ✅ 雲端只能讀取，不能寫入

## 💰 成本控制

### 免費額度（Vercel）
```
✅ 100GB 帶寬/月
✅ 1000 次 Build/月
✅ 1000 小時執行時間/月
✅ 無限請求數
```

### 免費額度（Supabase）
```
✅ 500MB 數據庫存儲
✅ 1GB 文件存儲
✅ 2GB 出站流量/月
✅ 50,000 月活躍用戶
```

### 需要關閉的功能（避免超額）
```javascript
// 關閉不需要的 API 路由
// vercel.json 中配置
{
  "functions": {
    "src/app/api/ai/chat/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/voice/**": {
      "maxDuration": 0  // 完全禁用
    }
  }
}
```

## 🔄 數據同步策略

### 1. 本地 → 雲端（單向同步）
```
本地開機時 → 自動同步備份到雲端
本地關機時 → 雲端保留最後一次備份
```

### 2. 同步腳本
使用已創建的備份腳本：
- `scripts/simple-backup.bat` - 執行備份
- 定時執行（Windows 任務計劃）

### 3. 雲端讀取策略
```javascript
// API 路由優先讀取本地，失敗才讀雲端
export async function GET() {
  try {
    // 1. 嘗試讀取本地數據庫
    const localData = await db.local.findMany();
    return Response.json(localData);
  } catch (err) {
    // 2. 本地關機，讀取雲端備份
    const cloudData = await supabase.from('backup').select();
    return Response.json(cloudData);
  }
}
```

## 🚀 部署步驟

### 1. 準備 Vercel 部署
```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入
vercel login

# 部署
vercel --prod
```

### 2. 設置 Supabase 備份數據庫
1. 註冊 Supabase (supabase.com)
2. 創建新項目
3. 獲取連接字串
4. 設置環境變量

### 3. 配置環境變量（Vercel）
```bash
# 在 Vercel Dashboard 設置
DATABASE_URL=postgresql://...  # Supabase 連接
DIRECT_URL=postgresql://...     # Supabase 直連
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_KEY=your-key

# AI 功能（可選）
GLM_API_KEY=your-key

# LINE Bot（可選）
LINE_CHANNEL_ACCESS_TOKEN=your-token
```

### 4. 設置自動同步
```bash
# Windows 任務計劃
# 每天 2:00 AM 執行備份
schtasks /create /tn "BossAI-Backup" /tr "C:\Users\tian7\OneDrive\Desktop\媽媽ios\scripts\simple-backup.bat" /sc daily /st 02:00
```

## ⚠️ 重要限制

### 本地關機時
- ❌ 無法更新數據
- ❌ 無法使用 LINE Bot 打卡
- ✅ 可以查看舊數據
- ✅ 可以查看報表

### 本地開機時
- ✅ 所有功能正常
- ✅ 自動同步到雲端
- ✅ LINE Bot 正常運作

## 📊 監控建議

### 每月檢查
1. Vercel 使用量（Dashboard）
2. Supabase 存儲空間
3. 數據備份狀態

### 超額警告
```
Vercel:  超過 100GB 帶寬 → $20/100GB
Supabase: 超過 500MB → 需付費升級
```

## 🔧 故障處理

### 本地數據庫連不上
→ 自動切換到雲端備份模式（只讀）

### 雲端同步失敗
→ 檢查 simple-backup.bat 日誌
→ 確認網路連線正常

### 超過免費額度
→ 關閉不必要的功能
→ 減少圖片/檔案上傳
→ 優化 API 請求
