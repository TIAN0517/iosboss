# 九九瓦斯行管理系統 - 常見問題修護手冊

> **版本**: 2.0.0 Pro
> **更新日期**: 2025

---

## 目錄

1. [快速診斷](#快速診斷)
2. [安裝與設置問題](#安裝與設置問題)
3. [構建與部署問題](#構建與部署問題)
4. [數據庫問題](#數據庫問題)
5. [前端組件問題](#前端組件問題)
6. [API 問題](#api-問題)
7. [認證與權限問題](#認證與權限問題)
8. [AI 助手問題](#ai-助手問題)
9. [LINE Bot 問題](#line-bot-問題)
10. [性能問題](#性能問題)
11. [日誌與調試](#日誌與調試)

---

## 快速診斷

### 系統健康檢查清單

```bash
# 1. 檢查服務是否運行
pm2 status                    # PM2 進程狀態
netstat -ano | findstr :9999  # 檢查端口 9999

# 2. 檢查數據庫連接
bun run db:push              # 測試數據庫連接

# 3. 檢查環境變量
type .env                    # Windows
cat .env                     # Linux/Mac

# 4. 查看日誌
pm2 logs gas-station --lines 50
type logs\error.log
```

---

## 安裝與設置問題

### ❌ 問題：npm install 失敗

**錯誤訊息**:
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**解決方法**:

```bash
# 方法 1: 清除快取重新安裝
npm cache clean --force
rm -rf node_modules package-lock.json  # Linux/Mac
rd /s /q node_modules package-lock.json  # Windows
npm install

# 方法 2: 使用 Bun (推薦，更快)
bun install

# 方法 3: 使用 --legacy-peer-deps
npm install --legacy-peer-deps

# 方法 4: 單獨安裝問題套件
npm install --force prisma@6.11.1
npm install --force next@16.1.1-canary.5
```

---

### ❌ 問題：Prisma 生成失敗

**錯誤訊息**:
```
Error: P3005
The database schema is not empty.
```

**解決方法**:

```bash
# 方法 1: 重置數據庫 (⚠️ 會清除所有數據)
bun run db:reset

# 方法 2: 手動刪除數據庫文件
rm -f prisma/dev.db
rm -f prisma/migrations/*  # PostgreSQL/MySQL

# 方法 3: 使用 db push 強制同步
bun run db:push --skip-generate
bun run db:generate

# 方法 4: 檢查 DATABASE_URL 是否正確
# .env 文件必須包含有效的連接字符串
```

---

### ❌ 問題：TypeScript 類型錯誤

**錯誤訊息**:
```
TS2307: Cannot find module '@/components/XXX'
```

**解決方法**:

```bash
# 1. 檢查 tsconfig.json 路徑別名
# 確保有這個配置:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# 2. 重新生成 Prisma Client
bun run db:generate

# 3. 重啟 TypeScript Server
# VSCode: Ctrl+Shift+P -> "TypeScript: Restart TS Server"

# 4. 構建時忽略類型錯誤 (next.config.ts 已設置)
# next.config.ts 中已設置 ignoreBuildErrors: true
```

---

## 構建與部署問題

### ❌ 問題：構建時記憶體不足

**錯誤訊息**:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**解決方法**:

```bash
# 方法 1: 增加 Node.js 記憶體限制
set NODE_OPTIONS=--max-old-space-size=4096  # Windows (4GB)
export NODE_OPTIONS=--max-old-space-size=4096  # Linux/Mac

# 方法 2: 使用 Bun 構建 (更省記憶體)
bun run build

# 方法 3: 分批構建
next build --experimental-app-only

# 方法 4: 在 ecosystem.config.js 中設置
{
  max_memory_restart: '1G'  # 改為 2G
}
```

---

### ❌ 問題：靜態資源 404

**症狀**: 構建後 `/public/jyt.ico` 等文件找不到

**解決方法**:

```bash
# 1. 檢查 copy-assets.js 是否執行
# 構建後應該會自動執行

# 2. 手動複製靜態資源
xcopy .next\static .next\standalone\.next\static /E /I /Y  # Windows
cp -r .next/static .next/standalone/.next/static           # Linux/Mac
xcopy public .next\standalone\public /E /I /Y              # Windows
cp -r public .next/standalone/public                       # Linux/Mac

# 3. 檢查 standalone 模式配置
# next.config.ts 必須有 output: "standalone"
```

---

### ❌ 問題：PM2 啟動失敗

**錯誤訊息**:
```
PM2 Error: Script not found
```

**解決方法**:

```bash
# 1. 檢查 ecosystem.config.js 路徑
# cwd: 'C:\\Users\\tian7\\OneDrive\\Desktop\\媽媽ios'
# 確保這個路徑正確

# 2. 使用 cmd.exe 執行 npm (Windows)
{
  script: 'cmd.exe',
  args: '/c npm run start'
}

# 3. 直接執行 node
{
  script: '.next/standalone/server.js',
  env: { NODE_ENV: 'production', PORT: 9999 }
}

# 4. 刪除並重新啟動
pm2 delete all
pm2 start ecosystem.config.js
pm2 save
```

---

## 數據庫問題

### ❌ 問題：數據庫連接失敗

**錯誤訊息**:
```
Can't reach database server at `localhost:5432`
```

**解決方法**:

```bash
# 1. 檢查 PostgreSQL 是否運行
# Windows: 服務中查看 PostgreSQL-x64-xx
# 或使用: pg_isready

# 2. 檢查 .env 中的 DATABASE_URL
# 格式: postgresql://user:password@host:port/database?schema=public
# 示例: postgresql://postgres:Ss520520@localhost:5432/gas_management?schema=public

# 3. 測試連接
psql -U postgres -d gas_management -h localhost

# 4. 切換到 SQLite (開發環境)
# 修改 .env:
DATABASE_URL="file:./gas_management.db"
# 修改 prisma/schema.prisma:
provider = "sqlite"

# 5. 重新生成並推送
bun run db:generate
bun run db:push
```

---

### ❌ 問題：Prisma Client 未生成

**錯誤訊息**:
```
Error: @prisma/client did not initialize yet
```

**解決方法**:

```bash
# 1. 重新生成 Prisma Client
bun run db:generate

# 2. 檢查 node_modules/prisma
ls node_modules/.prisma/client

# 3. 刪除並重新安裝
rm -rf node_modules/.prisma
bun run db:generate

# 4. 檢查 schema.prisma 語法
bun prisma validate
```

---

### ❌ 問題：遷移衝突

**錯誤訊息**:
```
Migration failed: P3006
Migration `xxx` failed to apply cleanly
```

**解決方法**:

```bash
# 方法 1: 重置遷移歷史
rm -rf prisma/migrations
bun prisma migrate dev --name init

# 方法 2: 解決遷移衝突
bun prisma migrate resolve --rolled-back [migration-name]

# 方法 3: 使用 db push (開發環境)
bun run db:push --accept-data-loss

# ⚠️ 警告: --accept-data-loss 會丟失數據!
```

---

## 前端組件問題

### ❌ 問題：BrandIcon 不顯示

**症狀**: 頁面上看不到圖標

**解決方法**:

```tsx
// ✅ 正確使用
import { BrandIcon } from '@/components/BrandIcon'
<BrandIcon size={24} />

// ❌ 錯誤使用
import { Flame } from 'lucide-react'  // 不要用這個!

// 1. 檢查文件是否存在
// src/components/BrandIcon.tsx

// 2. 檢查 /public/jyt.ico 是否存在

// 3. BrandIcon.tsx 內容應該是:
export function BrandIcon({ size = 24, className = "" }: { size?: number, className?: string }) {
  return <img src="/jyt.ico" alt="九九瓦斯" width={size} height={size} className={className} />
}
```

---

### ❌ 問題：iOS 組件無法導入

**錯誤訊息**:
```
Module not found: Can't resolve '@/components/ui/ios-button'
```

**解決方法**:

```bash
# 1. 檢查文件是否存在
ls src/components/ui/ios-button.tsx
ls src/components/ui/ios-card.tsx
ls src/components/ui/ios-input.tsx

# 2. 如果不存在，檢查是否被誤刪
# 從 Git 恢復:
git checkout src/components/ui/ios-*.tsx

# 3. 手動創建 iOS 組件
# 使用現有的 Button/Card/Input 組件作為模板
# 添加觸覺回饋和更大尺寸
```

---

### ❌ 問題：shadcn/ui 組件樣式異常

**症狀**: 按鈕、卡片等組件沒有樣式

**解決方法**:

```bash
# 1. 檢查 Tailwind CSS 配置
# tailwind.config.js 必須包含:
content: [
  './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  './src/app/**/*.{js,ts,jsx,tsx,mdx}',
]

# 2. 檢查 globals.css 是否導入
# src/app/layout.tsx 必須有:
import './globals.css'

# 3. 重新構建 Tailwind
bun run build

# 4. 檢查 components.json 配置
```

---

### ❌ 問題：觸覺回饋不工作

**症狀**: 點擊按鈕沒有震動回饋

**解決方法**:

```tsx
// 1. 檢查 ios-utils.ts
// src/lib/ios-utils.ts 應該包含:

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  if (typeof window !== 'undefined' && 'navigator' in window) {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
        success: [10, 50, 10],
        warning: [20, 30],
        error: [30, 20, 30]
      }
      navigator.vibrate(patterns[type])
    }
  }
}

// 2. 確保按鈕調用了觸覺回饋
<IOSButton onClick={() => {
  triggerHaptic('light')
  // ...
}}>
```

---

### ❌ 問題：DialogContent 無 Description 警告

**錯誤訊息**:
```
Warning: Missing `Description` or `aria-describedby={undefined}` for {DialogContent}
```

**解決方法**:

```tsx
// src/components/ui/dialog.tsx

// ❌ 錯誤
<DialogPrimitive.Content
  className={...}
  {...props}
>

// ✅ 正確 (添加 aria-describedby)
<DialogPrimitive.Content
  data-slot="dialog-content"
  aria-describedby={undefined}
  className={...}
  {...props}
>
```

---

### ❌ 問題：Select.Item 空值錯誤

**錯誤訊息**:
```
Uncaught Error: A <Select.Item /> must have a value prop that is not an empty string.
```

**解決方法**:

```tsx
// ❌ 錯誤 - 使用空字串作為 value
<Select value={customerId} onValueChange={(v) => setCustomerId(v)}>
  <SelectItem value="">無對應客戶</SelectItem>
  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
</Select>

// ✅ 正確 - 使用 "none" 或其他非空字串
<Select value={customerId || "none"} onValueChange={(v) => setCustomerId(v === "none" ? undefined : v)}>
  <SelectItem value="none">無對應客戶</SelectItem>
  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
</Select>
```

---

### ❌ 問題：Speech recognition error: aborted

**錯誤訊息**:
```
Speech recognition error: aborted
```

**原因**: 使用者主動取消語音輸入或麥克風被占用

**解決方法**:

```tsx
// 這是正常行為，不是錯誤
// 使用者可以:
// 1. 再次點擊麥克風按鈕重新開始
// 2. 檢查是否有其他應用正在使用麥克風

// 處理方式:
const recognition = new window.SpeechRecognition()
recognition.onerror = (event) => {
  if (event.error === 'aborted') {
    console.log('語音識別已取消')
    // 這是正常行為，不需要特殊處理
  } else {
    console.error('語音識別錯誤:', event.error)
  }
}
```

---

## API 問題

### ❌ 問題：API 路由 404

**症狀**: fetch 請求返回 404

**解決方法**:

```bash
# 1. 檢查路由文件位置
# 正確: src/app/api/customers/route.ts
# 錯誤: src/app/api/customers.ts

# 2. 檢查文件導出
// route.ts 必須導出 HTTP 方法函數:
export async function GET(request: NextRequest) { }
export async function POST(request: NextRequest) { }

# 3. 檢查 URL 是否正確
// 正確: /api/customers
// 錯誤: /api/customer (單數)

# 4. 重啟開發服務器
bun run dev
```

---

### ❌ 問題：CORS 錯誤

**錯誤訊息**:
```
Access to fetch at 'XXX' has been blocked by CORS policy
```

**解決方法**:

```typescript
// 1. 在 API 路由中設置 CORS headers
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(data, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

// 2. 處理 OPTIONS 預檢請求
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}

// 3. 使用環境變量控制允許的來源
// .env: ALLOWED_ORIGINS=https://jytian.it.com,https://bossai.jytian.it.com
```

---

### ❌ 問題：請求體太大

**錯誤訊息**:
```
Payload Too Large / 413 Request Entity Too Large
```

**解決方法**:

```typescript
// 1. 在 next.config.ts 中設置 body size limit
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

// 2. 分批上傳或壓縮數據

// 3. 使用 FormData 代替 JSON
const formData = new FormData()
formData.append('file', file)
await fetch('/api/upload', { method: 'POST', body: formData })
```

---

### ❌ 問題：/api/staff 返回 500 錯誤

**錯誤訊息**:
```
Failed to load resource: the server responded with a status of 500 ()
```

**原因**: User 模型使用 `isActive` 欄位，但 API 查詢使用了 `active`

**解決方法**:

```typescript
// src/app/api/staff/route.ts

// ❌ 錯誤
where: {
  ...(status === 'active' ? { active: true } : status === 'inactive' ? { active: false } : {}),
}

// ✅ 正確
where: {
  ...(status === 'active' ? { isActive: true } : status === 'inactive' ? { isActive: false } : {}),
}
```

---

### ❌ 問題：/api/inventory 返回 400 錯誤

**錯誤訊息**:
```
Failed to load resource: the server responded with a status of 400 ()
```

**原因**: 驗證器中的類型清單與實際使用的類型不匹配

**解決方法**:

```typescript
// src/lib/validation.ts

// ❌ 錯誤 (舊的類型)
const validTypes = ['purchase', 'sale', 'return', 'adjustment']

// ✅ 正確 (匹配 inventory/route.ts)
const validTypes = ['purchase', 'delivery', 'return', 'adjust', 'damaged']
```

---

## 認證與權限問題

### ❌ 問題：登入後立即登出

**症狀**: 登入成功但立即被重定向到登入頁

**解決方法**:

```typescript
// 1. 檢查 Cookie 設置
// src/app/api/auth/login/route.ts:

// 設置 HttpOnly Cookie (SameSite: none 需要 HTTPS)
cookies().set('auth_token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',  // 改為 'lax' 或 'strict'
  maxAge: 604800,  // 7 天
  path: '/',
})

// 2. 檢查 Middleware
// src/middleware.ts 確保正確驗證 JWT

// 3. 開發環境允許 http
if (process.env.NODE_ENV === 'development') {
  sameSite: 'lax',
  secure: false,
}
```

---

### ❌ 問題：JWT 驗證失敗

**錯誤訊息**:
```
JsonWebTokenError: invalid signature
```

**解決方法**:

```bash
# 1. 檢查 JWT_SECRET 是否一致
# .env 中的 JWT_SECRET 必須與生成 token 時使用的一致

# 2. 重新生成 JWT_SECRET
# 使用: openssl rand -base64 32

# 3. 清除舊 token
localStorage.removeItem('auth_token')
document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

# 4. 重新登入
```

---

### ❌ 問題：無法訪問受保護路由

**症狀**: 訪問 `/customers` 等頁面被重定向到 `/login`

**解決方法**:

```typescript
// 1. 檢查 middleware.ts 配置
// src/middleware.ts:

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value

  // 公開路由 (不需要認證)
  const publicPaths = ['/login', '/api/auth/login']

  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 其他路由需要認證
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

// 2. 確保前端檢查認證狀態
// src/app/page.tsx 中的 useEffect
```

---

## AI 助手問題

### ❌ 問題：AI 助手無回應

**症狀**: 發送訊息後 AI 沒有回應

**解決方法**:

```bash
# 1. 檢查 GLM_API_KEY 是否設置
localStorage.getItem('GLM_API_KEY')
# 如果沒有，設置 API Key:
localStorage.setItem('GLM_API_KEY', 'your-api-key')

# 2. 檢查 .env 中的配置
GLM_API_KEY="your-key"
GLM_MODEL="glm-4.7"
GLM_TIMEOUT="600000"

# 3. 測試 API 連接
curl -X POST https://open.bigmodel.cn/api/paas/v4/chat/completions \
  -H "Authorization: Bearer your-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"glm-4.7","messages":[{"role":"user","content":"hi"}]}'

# 4. 檢查 BossJy-99 API 配置
# src/lib/boss-jy-99-api.ts

# 5. 使用本地 AI Agent 作為備選
# 系統會自動降級到本地處理
```

---

### ❌ 問題：語音輸入不工作

**症狀**: 點擊麥克風沒有反應

**解決方法**:

```typescript
// 1. 檢查瀏覽器支持
// 語音識別需要:
// - HTTPS 或 localhost
// - Chrome/Safari (支援 Web Speech API)

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  // 支持語音識別
} else {
  alert('您的瀏覽器不支援語音識別功能')
}

// 2. 檢查麥克風權限
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => console.log('麥克風權限已授予'))
  .catch(err => console.error('無法訪問麥克風:', err))

// 3. 語音設置 (src/components/VoiceInput.tsx)
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)()
recognition.lang = 'zh-TW'  // 台灣繁體中文
recognition.continuous = false
recognition.interimResults = true
```

---

### ❌ 問題：語音輸出沒有聲音

**症狀**: AI 回應沒有播放語音

**解決方法**:

```typescript
// 1. 檢查瀏覽器 TTS 支持
if ('speechSynthesis' in window) {
  const synth = window.speechSynthesis
  const voices = synth.getVoices()
  console.log('可用的語音:', voices)
} else {
  alert('您的瀏覽器不支援語音合成')
}

// 2. 設置中文語音
// src/lib/natural-tts.ts:

const utterance = new SpeechSynthesisUtterance(text)
const zhVoices = voices.filter(v => v.lang.startsWith('zh'))
if (zhVoices.length > 0) {
  utterance.voice = zhVoices[0]
}
utterance.lang = 'zh-TW'
utterance.rate = 1.0
utterance.pitch = 1.0

// 3. 檢查 GLM TTS 配置
# .env:
TTS_SERVICE="glm"  # 或 "browser"
GLM_TTS_MODEL="tts-1"
GLM_TTS_API_KEY="your-key"
```

---

## LINE Bot 問題

### ❌ 問題：LINE Bot 無回應

**症狀**: 發送訊息到 LINE Bot 沒有回應

**解決方法**:

```bash
# 1. 檢查 Webhook URL
# LINE Developers Console:
# Webhook URL: https://linebot.jytian.it.com/api/webhook/line

# 2. 檢查 Channel Access Token 和 Secret
# .env:
LINE_CHANNEL_ACCESS_TOKEN="your-token"
LINE_CHANNEL_SECRET="your-secret"

# 3. 測試 Webhook
curl -X POST https://linebot.jytian.it.com/api/webhook/line \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: test" \
  -d '{"events":[]}'

# 4. 檢查路由是否正確
# src/app/api/webhook/line/route.ts 必須存在並導出 POST 函數

# 5. 查看日誌
pm2 logs gas-station | grep -i line
```

---

### ❌ 問題：LINE 訊息發送失敗

**錯誤訊息**:
```
Error: Invalid signature
```

**解決方法**:

```typescript
// 1. 驗證簽名
// src/app/api/webhook/line/route.ts:

import crypto from 'crypto'

function verifySignature(body: string, signature: string, secret: string): boolean {
  const hash = crypto.createHmac('sha256', secret).update(body).digest('base64')
  return hash === signature
}

// 2. 獲取原始 body
// Next.js 15 需要使用:
const body = await request.json()  // 這會解析 JSON
// 為了驗證簽名，需要原始 body:
const rawBody = await request.text()
```

---

## 性能問題

### ❌ 問題：頁面加載慢

**症狀**: 首次加載超過 3 秒

**解決方法**:

```typescript
// 1. 啟用靜態生成 (SSG)
// next.config.ts:
const nextConfig = {
  output: 'standalone',
  // 靜態生成常見頁面
  generateStaticParams: async () => {
    return []
  }
}

// 2. 優化圖片
import Image from 'next/image'
<Image src="/jyt.ico" width={32} height={32} alt="logo" />

// 3. 代碼分割
// 動態導入大型組件:
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>載入中...</p>
})

// 4. 使用 React.memo
export const MyComponent = React.memo(function MyComponent({ data }) {
  // ...
})

// 5. 使用 TanStack Query 緩存數據
import { useQuery } from '@tanstack/react-query'
const { data } = useQuery({
  queryKey: ['customers'],
  queryFn: () => fetch('/api/customers').then(r => r.json()),
  staleTime: 60000,  // 1 分鐘內使用緩存
})
```

---

### ❌ 問題：數據庫查詢慢

**症狀**: API 請求超時

**解決方法**:

```typescript
// 1. 添加索引
// prisma/schema.prisma:
model Customer {
  // ...
  @@index([phone])  // 為 phone 字段添加索引
  @@index([name])
}

// 2. 使用 select 只選需要的字段
const customers = await db.customer.findMany({
  select: {
    id: true,
    name: true,
    phone: true,
    // 不選取不需要的字段
  }
})

// 3. 分頁查詢
const customers = await db.customer.findMany({
  take: 20,
  skip: (page - 1) * 20,
})

// 4. 使用 include 預加載關聯數據
const orders = await db.gasOrder.findMany({
  include: {
    customer: { select: { id: true, name: true } },
    items: true,
  }
})
```

---

### ❌ 問題：記憶體洩漏

**症狀**: PM2 進程記憶體持續增長

**解決方法**:

```typescript
// 1. 檢查未關閉的連接
// 確保所有 Prisma Client 使用單例模式
// src/lib/db.ts:

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// 2. 清理計時器
useEffect(() => {
  const interval = setInterval(() => {}, 1000)
  return () => clearInterval(interval)  // 清理
}, [])

// 3. 設置 PM2 記憶體限制
// ecosystem.config.js:
{
  max_memory_restart: '500M',
  memory_limit: '500M',
}

// 4. 使用 weak references
const weakMap = new WeakMap()
```

---

## 日誌與調試

### 啟用調試模式

```bash
# 1. 啟用數據庫查詢日誌
# .env:
DATABASE_LOGGING="true"

# 2. 啟用詳細日誌
# .env:
LOG_LEVEL="debug"

# 3. 使用 Prisma Studio
bun prisma studio
# 打開 http://localhost:5555

# 4. Chrome DevTools
# - 打開開發者工具 (F12)
# - Network 標籤查看 API 請求
# - Console 查看錯誤訊息
# - React DevTools 查看組件樹
```

### 查看日誌

```bash
# PM2 日誌
pm2 logs gas-station
pm2 logs gas-station --lines 100
pm2 logs gas-station --err  # 只看錯誤

# 文件日誌
type logs\error.log      # Windows
tail -f logs/error.log   # Linux/Mac

# 開發日誌
type dev.log
```

### 常用調試命令

```bash
# 檢查端口占用
netstat -ano | findstr :9999  # Windows
lsof -i :9999                 # Linux/Mac

# 檢查進程
pm2 list
pm2 monit

# 重啟服務
pm2 restart gas-station
pm2 reload gas-station  # 平滑重啟

# 查看環境變量
pm2 env gas-station

# 清空日誌
pm2 flush
```

---

## 緊急恢復程序

### 數據庫損壞

```bash
# 1. 備份現有數據
cp prisma/dev.db prisma/dev.db.backup

# 2. 重置數據庫
bun run db:reset

# 3. 恢復種子數據
bun run db:seed

# 4. 如果有 SQL 備份
psql -U postgres -d gas_management -f backup.sql
```

### 完全重裝

```bash
# 1. 停止服務
pm2 delete all

# 2. 清理所有文件
rm -rf node_modules .next prisma/dev.db

# 3. 重新安裝
bun install

# 4. 初始化數據庫
bun run db:setup

# 5. 重新啟動
pm2 start ecosystem.config.js
pm2 save
```

---

## 聯繫支持

如果以上方法無法解決問題：

1. **檢查日誌**: 收集相關錯誤日誌
2. **記錄環境**: Node.js 版本、操作系統、瀏覽器
3. **重現步驟**: 詳細描述如何重現問題
4. **截圖**: 如果是 UI 問題，提供截圖

**技術支持**: Jy技術團隊
**技術總監**: BossJy

---

*本文檔由 Jy技術團隊維護 • 技術總監: BossJy*
