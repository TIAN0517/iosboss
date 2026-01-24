# 九九瓦斯行管理系統 - Supabase 完整配置指南

## 🎯 一次性完整配置步驟

本指南將幫助您一次性完成所有 Supabase 配置，包括：
- ✅ 環境變量配置
- ✅ Row Level Security (RLS) 策略
- ✅ 攻擊防護設置
- ✅ 性能優化索引
- ✅ 配置驗證

---

## 📋 配置步驟清單

### 步驟 1：配置環境變量 ✅

**文件位置**：`.env`（項目根目錄）

**需要添加的配置**：

```env
# ========================================
# Supabase 配置
# ========================================

# Supabase 專案 URL
NEXT_PUBLIC_SUPABASE_URL=https://mdmltksbpdyndoisnqhy.supabase.co

# Supabase Anon Key（用於前端）
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kbWx0a3NicGR5bmRvaXNucWh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMTM0NDYsImV4cCI6MjA4MjU4OTQ0Nn0.7-xtopwRK9-Bq04hb4Ntftz5EaSQiyNtX4Yd6m_LizM

# Supabase Service Role Key（用於後端，請從 Dashboard 獲取）
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=sb_secret_PloQCSW91a11td9_ejkaEQ_2faT0bs2

# Supabase Publishable Key（推薦使用）
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_3p1ly5-SPsrI5178yr7Qjg_i7OBKEJQ
```

**獲取 Service Role Key 的方法**：
1. 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/api
2. 在「Secret keys」區域找到 `service_role` 密鑰
3. 複製並替換上面的 `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` 值

---

### 步驟 2：配置 Row Level Security (RLS) 策略 ✅

**執行方式**：在 Supabase SQL Editor 中執行

1. **訪問 SQL Editor**
   ```
   https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/sql
   ```

2. **執行配置 SQL**
   - 打開文件：`backups/migration/supabase-complete-setup.sql`
   - 複製全部內容
   - 粘貼到 SQL Editor
   - 點擊「Run」執行

3. **驗證執行結果**
   - 應該看到成功消息
   - 如果出現錯誤，檢查錯誤信息並修復

**配置內容包括**：
- ✅ 所有表的 RLS 策略
- ✅ 用戶權限控制（管理員 vs 普通用戶）
- ✅ 性能優化索引
- ✅ 數據訪問控制

---

### 步驟 3：配置攻擊防護設置 ✅

**訪問路徑**：
```
https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/auth/protection
```

**配置項目**：

#### 3.1 防止使用外洩的密碼 ⭐ **必須開啟**

1. 找到「防止使用外洩的密碼」開關
2. 切換為「開啟」
3. 點擊「儲存變更」

**作用**：防止用戶使用弱密碼或已洩露的密碼

#### 3.2 啟用驗證碼保護（可選）

**開發環境**：可以關閉（方便測試）  
**生產環境**：建議開啟（需要先配置電子郵件）

**配置步驟**：
1. 先配置電子郵件提供者（見步驟 4）
2. 將「啟用驗證碼保護」開關切換為「開啟」
3. 點擊「儲存變更」

---

### 步驟 4：配置電子郵件提供者（如需要驗證碼）✅

**訪問路徑**：
```
https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/auth/providers
```

**配置選項**：

#### 選項 A：使用 Supabase 默認服務（開發環境）

1. 選擇「Email」提供商
2. 使用默認配置
3. 保存設置

**限制**：
- 每日發送限制：3 封郵件
- 僅用於開發和測試

#### 選項 B：使用自定義 SMTP（生產環境推薦）

1. 選擇「Email」提供商
2. 選擇「Custom SMTP」
3. 輸入 SMTP 配置：
   - **SMTP Host**：您的 SMTP 服務器地址（如 `smtp.gmail.com`）
   - **SMTP Port**：端口號（如 `587`）
   - **SMTP User**：SMTP 用戶名
   - **SMTP Password**：SMTP 密碼
   - **Sender Email**：發送者郵箱地址
   - **Sender Name**：發送者名稱

4. 測試郵件發送
5. 保存設置

**推薦的 SMTP 服務**：
- SendGrid
- Mailgun
- AWS SES
- Gmail（開發環境）

---

### 步驟 5：配置數據庫備份 ✅

**訪問路徑**：
```
https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy/settings/database
```

**配置步驟**：

1. 找到「Backups」區域
2. 啟用「Daily Backups」
3. 設置備份保留時間（建議 7-30 天）
4. 保存設置

**作用**：
- 自動備份數據庫
- 支持時間點恢復
- 防止數據丟失

---

### 步驟 6：驗證配置 ✅

**執行驗證腳本**：

```bash
# 在項目根目錄執行
node scripts/verify-supabase-config.js
```

**手動驗證步驟**：

1. **測試數據庫連接**
   ```typescript
   import { createClient } from '@supabase/supabase-js'
   
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   )
   
   // 測試查詢
   const { data, error } = await supabase
     .from('User')
     .select('*')
     .limit(1)
   
   console.log('連接測試:', data, error)
   ```

2. **測試 RLS 策略**
   - 嘗試以不同角色用戶登入
   - 驗證數據訪問權限是否正確

3. **測試攻擊防護**
   - 嘗試使用弱密碼註冊（應該被阻止）
   - 嘗試多次登入失敗（應該觸發驗證碼）

---

## 📊 配置檢查清單

### 環境變量配置 ✅

- [ ] `NEXT_PUBLIC_SUPABASE_URL` 已設置
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 已設置
- [ ] `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` 已設置
- [ ] 所有環境變量格式正確

### RLS 策略配置 ✅

- [ ] 已執行 `supabase-complete-setup.sql`
- [ ] 所有表已啟用 RLS
- [ ] 用戶權限策略已配置
- [ ] 管理員權限策略已配置

### 攻擊防護配置 ✅

- [ ] 「防止使用外洩的密碼」已開啟
- [ ] 「啟用驗證碼保護」已配置（可選）
- [ ] 電子郵件提供者已配置（如需要）

### 數據庫配置 ✅

- [ ] 自動備份已啟用
- [ ] 性能優化索引已創建
- [ ] 數據庫連接正常

### 應用程序配置 ✅

- [ ] 已安裝 `@supabase/supabase-js`
- [ ] 前端代碼已更新使用 Supabase
- [ ] 後端 API 已更新使用 Supabase
- [ ] 測試通過

---

## 🚨 常見問題

### Q1: RLS 策略執行失敗

**原因**：可能是表不存在或權限不足

**解決方法**：
1. 確認所有表都已創建
2. 使用 Service Role Key 執行 SQL
3. 檢查錯誤信息並修復

### Q2: 環境變量不生效

**原因**：Next.js 需要重啟才能讀取新的環境變量

**解決方法**：
```bash
# 停止開發服務器
# 重新啟動
npm run dev
```

### Q3: 驗證碼保護無法啟用

**原因**：未配置電子郵件提供者

**解決方法**：
1. 先完成步驟 4（配置電子郵件提供者）
2. 再啟用驗證碼保護

---

## 📞 需要幫助？

如果在配置過程中遇到問題：

1. **查看 Supabase 文檔**：
   - RLS：https://supabase.com/docs/guides/auth/row-level-security
   - 攻擊防護：https://supabase.com/docs/guides/auth/auth-captcha
   - 電子郵件：https://supabase.com/docs/guides/auth/auth-smtp

2. **查看項目文檔**：
   - 完整遷移報告：`backups/migration/COMPLETE_MIGRATION_REPORT.md`
   - Supabase 配置指南：`docs/SUPABASE_CONFIGURATION_GUIDE.md`

3. **Supabase Dashboard**：
   - 訪問：https://supabase.com/dashboard/project/mdmltksbpdyndoisnqhy
   - 查看日誌和錯誤信息

---

**配置完成日期**：2025-12-29  
**配置狀態**：待執行
