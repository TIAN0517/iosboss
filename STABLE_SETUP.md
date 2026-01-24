# 九九瓦斯行 - 穩定雙服務配置

## 架構概述

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Tunnel                        │
│                  (linebot.tiankai.it.com)                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐   ┌───────────────────────┐
│   Next.js 後台        │   │   Python AI 服務      │
│   端口: 9999          │   │   端口: 8888          │
│                       │   │                       │
│   • Web UI            │◄──┤   • LINE Webhook      │
│   • API 端點          │   │   • GLM-4.7 AI        │
│   • Prisma ORM        │   │   • 調用 Next.js API  │
│   • 數據庫連接         │   │                       │
└───────────┬───────────┘   └───────────────────────┘
            │
            ▼
    ┌───────────────┐
    │  PostgreSQL   │
    │  端口: 5432   │
    └───────────────┘
```

## 端口分配（固定）

| 服務 | 端口 | 配置位置 |
|------|------|----------|
| Next.js 後台 | **9999** | `.env` 中的 `PORT=9999` |
| Python AI 服務 | **8888** | `line_bot_ai/.env` 中的 `FASTAPI_PORT=8888` |
| PostgreSQL | **5432** | - |

## 數據同步機制

### 單一數據源原則
1. **只有 Next.js 直接連接數據庫**
2. **Python AI 通過 HTTP API 調用 Next.js**
3. **不允許 Python AI 直接連接數據庫**

### API 通信流程
```
LINE 用戶 → Python AI (8888) → Next.js API (9999) → 數據庫
              ↓
         GLM-4.7 AI 處理
              ↓
         回覆 LINE 用戶
```

### 關鍵配置

**Next.js (.env)**:
```bash
PORT=9999
DATABASE_URL=postgresql://postgres:Ss520520@localhost:5432/postgres
```

**Python AI (line_bot_ai/.env)**:
```bash
FASTAPI_PORT=8888
MAIN_SYSTEM_URL=http://localhost:9999
# 不要配置 DATABASE_URL！
```

## 啟動順序（重要！）

1. **PostgreSQL** (必須先啟動)
2. **Next.js** (端口 9999)
3. **Python AI** (端口 8888)
4. **Cloudflare Tunnel** (可選)

## 每日啟動步驟

### 方法 1: 使用統一腳本（推薦）
```batch
start-all-services.bat
```

### 方法 2: 手動啟動
```batch
# 終端 1: Next.js
npm run dev

# 終端 2: Python AI
cd line_bot_ai
python -m uvicorn app.main:app --host 0.0.0.0 --port 8888

# 終端 3: Cloudflare Tunnel (管理員)
install-cloudflare-service.bat
```

## 檢查服務狀態

```bash
# 檢查端口
netstat -ano | findstr ":9999 :8888 :5432"

# 測試服務
curl http://localhost:9999/api/health
curl http://localhost:8888/api/health

# 測試數據同步
cd line_bot_ai
python -c "from app.sync import check_connection; print(check_connection())"
```

## 故障排除

### Python AI 無法查詢數據
**檢查**:
1. Next.js 是否運行在 9999
2. `line_bot_ai/.env` 中的 `MAIN_SYSTEM_URL=http://localhost:9999`
3. 測試: `curl http://localhost:9999/api/health`

### LINE Bot 無回應
**檢查**:
1. Python AI 是否運行在 8888
2. LINE Webhook URL: `https://linebot.tiankai.it.com/api/webhook/line`
3. Cloudflare Tunnel 是否運行

### 端口衝突
**解決**:
- 9999: Next.js 專用
- 8888: Python AI 專用
- 8000: 可能被其他服務佔用（避免使用）

## 關鍵配置文件

| 文件 | 作用 | 必須配置 |
|------|------|----------|
| `.env` | Next.js 環境變量 | `PORT=9999`, `DATABASE_URL` |
| `line_bot_ai/.env` | Python AI 環境變量 | `FASTAPI_PORT=8888`, `MAIN_SYSTEM_URL` |
| `cloudflared.yml` | Cloudflare Tunnel | 路由到 8888 和 9999 |
| `line_bot_ai/app/sync.py` | 數據同步模組 | 默認 `MAIN_SYSTEM_URL=9999` |

## 穩定性保證

1. **固定端口** - 永遠使用 9999 和 8888
2. **環境變量** - `.env` 文件明確配置
3. **API 通信** - Python AI 不直接連接數據庫
4. **自動重啟** - 使用 `start-all-services.bat`
5. **日誌記錄** - `logs/` 目錄記錄所有日誌

## Webhook URL

| 功能 | URL | 路由到 |
|------|-----|--------|
| LINE Bot | https://linebot.tiankai.it.com/api/webhook/line | Python AI (8888) |
| 後台管理 | https://bossai.tiankai.it.com | Next.js (9999) |

---

**最後更新**: 2025-01-16
**狀態**: 生產就緒
