# 瓦斯站數據備份說明

## 備份時間：2026-01-31

---

## 📊 數據統計

### 吉安站 (Ji-An)
| 表名 | 記錄數 |
|------|--------|
| customers_ji_an | 9,207 |
| io1_ji_an | 90,068 |
| io2_ji_an | 1,644 |
| goods_ji_an | 69 |
| emp_ji_an | 35 |

### 美崙站 (Mei-Lun)
| 表名 | 記錄數 |
|------|--------|
| customers_meilun | 8,116 |
| io1_meilun | 61,808 |
| io2_meilun | 338 |
| goods_meilun | 29 |
| emp_meilun | 31 |

---

## 📁 備份文件清單

| 文件名 | 大小 | 說明 |
|--------|------|------|
| `ji_an_999gas.bak` | 769 MB | SQL Server 2008 原始備份 (吉安站) |
| `meilun_99999.bak` | 292 MB | SQL Server 2008 原始備份 (美崙站) |
| `ji_an_complete_export.sql` | 401 MB | PostgreSQL INSERT 格式 (吉安站) |
| `meilun_complete_export.sql` | 278 MB | PostgreSQL INSERT 格式 (美崙站) |
| `mama_ios_full_backup_20260131.dump` | 23 MB | VPS PostgreSQL 完整備份 |

---

## 🔄 恢復方式

### PostgreSQL 恢復（推薦）
```bash
# 恢復完整數據庫
pg_restore -U postgres -d mama_ios mama_ios_full_backup_20260131.dump

# 或單獨導入 SQL 文件
psql -U postgres -d mama_ios -f ji_an_complete_export.sql
psql -U postgres -d mama_ios -f meilun_complete_export.sql
```

### SQL Server 恢復（如需原格式）
```sql
-- 吉安站
RESTORE DATABASE CPF47_GAS FROM DISK = 'ji_an_999gas.bak'

-- 美崙站
RESTORE DATABASE CPF47_MEILUN FROM DISK = 'meilun_99999.bak'
```

---

## 🌐 生產環境

- **VPS**: root@107.172.46.245
- **數據庫**: mama_ios (PostgreSQL 14)
- **域名**:
  - mama.tiankai.it.com (主站)
  - gas.tiankai.it.com (瓦斯商城)

---

## ⚠️ 注意事項

1. 兩站數據完全分離，表名後綴區分：
   - `_ji_an` = 吉安站
   - `_meilun` = 美崙站

2. 數據使用 JSONB 格式存儲，保留原始欄位名

3. 編碼：UTF-8，中文正常顯示

---

生成時間: 2026-01-31 17:30
