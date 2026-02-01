# 媽媽ios 项目完整盘点报告

## 📊 项目概览

**本地路径**: `C:\Users\tian7\OneDrive\Desktop\媽媽ios`
**目标VPS**: root@107.172.46.245
**原VPS**: ubuntu@165.154.226.148 (保留BOSSJY DDoS平台)

---

## 🔍 功能模块盘点

| 模块 | 功能 | 状态 | 备注 |
|------|------|------|------|
| app/ | Next.js 主应用 | ⬜ 待确认 | |
| **gas-project/** | **瓦斯器具商城** | ✅ 已打包 | 花蓮九九/帝皇/高銘瓦斯行 |
| line_bot_ai | LINE Bot AI版 | ⬜ 待确认 | |
| line_bot_go | LINE Bot Go版 | ⬜ 待确认 | |
| voice_assistant | 语音助手 | ⬜ 待确认 | |
| bossai-api | API服务 | ⬜ 待确认 | |
| BOSSJY/ | DDoS平台 | ❌ 不迁移 | 保持在原VPS |
| data/ | 数据目录 | ⬜ 待确认 | |

---

## ⚠️ 数据情况紧急说明

### 本地数据库状态
```
Tables in mama-ios db/custom.db:
  User: 1 records
  Customer: 0 records        ← 空！
  ProductCategory: 8 records
  Product: 42 records
  Inventory: 42 records
  CustomerGroup: 10 records
  GasOrder: 0 records        ← 空！
  GasOrderItem: 0 records    ← 空！
```

### 关键问题
❌ **吉安站、美崙站数据不在本地！**

数据在原VPS的PostgreSQL数据库中：
- 原VPS: ubuntu@165.154.226.148
- 数据库: mama_ios
- 需要导出的表: Customer, GasOrder, GasOrderItem, DeliveryRecord 等

---

## 🗄️ 数据库迁移清单

### 必须从原VPS导出的数据
| 表名 | 说明 | 关键数据 |
|------|------|----------|
| Customer | 客户信息 | ✅ 吉安站、美崙站客户 |
| CustomerGroup | 客户分组 | |
| GasOrder | 瓦斯订单 | ✅ 订单记录 |
| GasOrderItem | 订单明细 | |
| DeliveryRecord | 配送记录 | |
| Product | 产品 | |
| ProductCategory | 产品分类 | |
| Inventory | 库存 | |
| MeterReading | 抄表记录 | |

---

## 🌐 DNS 子域名规划 (生产级)

### 方案：按业务拆分

| 子域名 | 服务 | 端口 | 优先级 |
|--------|------|------|--------|
| mama.tiankai.it.com | 主站 | 3000 | P0 |
| gas.tiankai.it.com | 瓦斯商城 | 3001 | P0 |
| line.tiankai.it.com | LINE Bot | 3002 | P1 |
| voice.tiankai.it.com | 语音助手 | 3003 | P2 |
| api.tiankai.it.com | API Gateway | 3004 | P1 |

---

## ✅ 迁移检查清单

### Step 1: 数据导出 (从原VPS)
- [ ] 连接原VPS PostgreSQL
- [ ] 导出 Customer 表 (含吉安站、美崙站)
- [ ] 导出 GasOrder, GasOrderItem
- [ ] 导出 DeliveryRecord
- [ ] 导出 Product, Inventory
- [ ] 打包为SQL或JSON

### Step 2: 本地整合
- [ ] 确认保留的功能模块
- [ ] 导入数据库到本地
- [ ] 测试各功能正常
- [ ] 配置环境变量

### Step 3: 部署到新VPS
- [ ] 打包完整项目
- [ ] 传输到新VPS
- [ ] 配置PostgreSQL
- [ ] 恢复数据库
- [ ] 配置Nginx反向代理
- [ ] 配置SSL证书
- [ ] 配置PM2进程管理
- [ ] 配置防火墙
- [ ] 更新DNS记录

---

## 🚨 重要提醒

1. **数据优先**: 吉安站、美崙站数据必须在迁移后完整保留
2. **生产级**: 新VPS需要配置：
   - PostgreSQL 数据库
   - Nginx + SSL
   - PM2 进程守护
   - 防火墙配置
   - 定期备份

3. **BOSSJY不动**: DDoS平台继续在原VPS运行

---

**创建时间**: 2026-01-31
**状态**: 待确认数据导出方案
