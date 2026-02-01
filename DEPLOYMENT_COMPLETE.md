# 瓦斯站系統部署完成報告

## 📊 部署狀態：✅ 完成

**部署日期**: 2026-01-31
**VPS**: root@107.172.46.245

---

## 🌐 線上服務

| 域名 | 用途 | 狀態 |
|------|------|------|
| https://mama.tiankai.it.com | 主後台系統 | ✅ 正常 |
| https://gas.tiankai.it.com | 瓦斯商城 | ✅ 正常 |
| https://linebot.tiankai.it.com | LINE Bot Webhook | ✅ 正常 |

---

## 📦 數據庫統計

### 吉安站 (Ji-An)
- 客戶: **9,207** 筆
- 交易記錄 (IO1): **90,068** 筆
- 交易記錄 (IO2): **1,644** 筆
- 商品: **69** 筆
- 員工: **35** 筆

### 美崙站 (Mei-Lun)
- 客戶: **8,116** 筆
- 交易記錄 (IO1): **61,808** 筆
- 交易記錄 (IO2): **338** 筆
- 商品: **29** 筆
- 員工: **31** 筆

---

## 🔗 API 端點

### 健康檢查
```
GET https://mama.tiankai.it.com/api/health
```

### 數據查詢
```
GET https://mama.tiankai.it.com/api/gas-data?station=ji_an&type=customers&limit=20
GET https://mama.tiankai.it.com/api/gas-data?station=meilun&type=customers&limit=20
GET https://mama.tiankai.it.com/api/gas-data?station=ji_an&type=customers&search=關鍵字
```

### LINE Bot Webhook
```
POST https://linebot.tiankai.it.com/api/webhook/line
```

---

## 🔧 服務管理

### PM2 命令
```bash
ssh root@107.172.46.245

# 查看狀態
pm2 list

# 重啟服務
pm2 restart mama-ios-main

# 查看日誌
pm2 logs mama-ios-main

# 保存配置
pm2 save
```

### Nginx 命令
```bash
# 重載配置
systemctl reload nginx

# 查看狀態
systemctl status nginx
```

---

## 📁 本地備份位置

```
C:\Users\tian7\OneDrive\Desktop\媽媽ios\backups\
├── ji_an_999gas.bak          # 吉安站 SQL Server 原始備份 (769MB)
├── meilun_99999.bak          # 美崙站 SQL Server 原始備份 (292MB)
├── ji_an_complete_export.sql # 吉安站 PostgreSQL 格式 (401MB)
├── meilun_complete_export.sql # 美崙站 PostgreSQL 格式 (278MB)
└── mama_ios_full_backup_20260131.dump # VPS PostgreSQL 備份 (23MB)
```

---

## 🔄 每日自動同步

### 腳本位置
```
C:\Tools\daily_sync_to_vps.ps1
```

### 設置計劃任務
```powershell
# 以管理員身份運行
powershell -ExecutionPolicy Bypass -File "C:\Tools\setup_scheduled_task.ps1"
```

### 手動執行同步
```powershell
powershell -ExecutionPolicy Bypass -File "C:\Tools\daily_sync_to_vps.ps1"
```

---

## ⚠️ 重要提醒

1. **LINE Bot 需要在 LINE Developers Console 更新 Webhook URL**
   - 新 URL: `https://linebot.tiankai.it.com/api/webhook/line`

2. **SSL 證書自動續期** (Let's Encrypt)
   - 到期日: 2026-05-01
   - 會自動續期

3. **PM2 自動啟動已配置**
   - 重啟後服務自動恢復

4. **數據庫密碼**
   - PostgreSQL: `Ss520520`

---

## 🚀 下一步

1. [ ] 在 LINE Developers Console 更新 Webhook URL
2. [ ] 測試 LINE Bot 功能
3. [ ] 設置本地計劃任務實現每日同步
4. [ ] 配置吉安站/美崙站電腦的 SSH 密鑰免密登錄

---

**報告生成時間**: 2026-01-31 19:10 (UTC+8)
