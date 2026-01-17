# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**九九瓦斯行管理系統** (BossJy-99 Gas Management System) is an iOS-optimized PWA gas station management system for elderly users in Taiwan. Built with Next.js 14, designed for large touch targets, simplified workflows, and zero-error tolerance.

**Dual Architecture:**
- **Next.js Frontend** (main app) - Deployed to Vercel or run locally
- **Python FastAPI Service** (`line_bot_ai/`) - LINE Bot + AI + Voice features, runs in Docker

## Deployment

### Local Deployment (Development)

**Important:** For local development, do NOT use Docker. Run services directly:

```bash
# 1. Kill any existing processes on port 9999 (Windows)
netstat -ano | findstr :9999
taskkill /PID <PID> /F

# 2. Start Next.js dev server (logs to dev.log)
npm run dev    # or: bun run dev

# The Python LINE Bot AI service should NOT run in Docker for local dev
# Only use Docker for production deployment of the Python service
```

### Vercel (Production - Recommended for Next.js)

The Next.js app is configured for Vercel deployment:
- Region: Hong Kong (`hkg1`)
- API timeouts: 60s (default), 120s for AI/voice routes
- Install command: `npm install --legacy-peer-deps`

```bash
# Deploy to Vercel
git push origin main  # Triggers auto-deploy if configured
# Or use Vercel CLI: vercel --prod
```

### Docker (LINE Bot AI Service - Production Only)

```bash
# Start the LINE Bot AI service (Python FastAPI)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop service
docker-compose down
```

**Service:**
- `line-bot-ai`: FastAPI on port 9999 (LINE Bot, GLM-4.7 AI, voice features)
  - GLM-4.7 MAX AI integration
  - LINE webhook handling
  - Voice recognition (Whisper) and synthesis
  - Schedule/leave request parsing
  - Health check: `/api/health`

### Local Development

```bash
# Next.js development server (port 9999, logs to dev.log)
# Both npm and bun work (bun has npm compatibility)
npm run dev    # or: bun run dev

# Build for production
npm run build  # or: bun run build

# Database operations
npm run db:setup     # Full setup: generate + push + seed
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed initial data
npm run db:migrate   # Run Prisma migrations
npm run db:reset     # Reset database
npm run lint         # Run ESLint
```

## Architecture

### Tech Stack (Next.js App)
- **Framework**: Next.js 14 App Router
- **Database**: Prisma ORM + PostgreSQL (Supabase for Vercel deployment)
- **UI**: Tailwind CSS 4 + shadcn/ui (Radix)
- **State**: Zustand + TanStack Query
- **Icons**: Custom `<BrandIcon>` component ONLY (uses `/public/jyt.ico`)
- **Authentication**: JWT with Web Crypto API (Edge Runtime compatible middleware)

### Python FastAPI Service (`line_bot_ai/`)
- **Framework**: FastAPI + Uvicorn
- **AI**: GLM-4.7 MAX (zhipuai SDK)
- **LINE Bot**: LINE Bot SDK
- **Voice**: Whisper ASR, voice synthesis
- **Features**: Schedule parsing, employee management, attendance, OCR

### Third-Party Integrations (Next.js)
- **Socket.IO** (`socket.io` + `socket.io-client`) - Real-time features and live updates
- **z-ai-web-dev-sdk** - AI/voice chat features (GLM API integration)
- **xlsx** - Excel import/export functionality
- **@dnd-kit** - Drag and drop functionality for sortable lists
- **bcryptjs** - Password hashing for authentication
- **@supabase/supabase-js** - Supabase client for Vercel deployment

### Real-Time Features (Socket.IO)
The app uses Socket.IO for real-time updates:
- Order status changes
- Driver location updates
- Inventory alerts
- Notification broadcasts

Socket server is integrated with Next.js API routes.

### Python Service Architecture (`line_bot_ai/`)

The FastAPI service provides AI and LINE Bot features:

**Key Modules:**
- `main.py` - FastAPI app entry point, CORS, lifespan management
- `line_webhook.py` - LINE webhook handling
- `ai_glm47.py` - GLM-4.7 AI client
- `voice_asr.py` - Voice recognition (Whisper)
- `voice_tts.py` - Text-to-speech
- `prompts.py` - AI prompt templates

**App Modules:**
- `app/main.py` - Route handlers
- `app/ai_handler.py` - AI request processing
- `app/asr_handler.py` - Speech recognition
- `app/voice.py` - Voice features
- `app/realtime_voice.py` - Real-time voice
- `app/whisper_asr.py` - Whisper ASR
- `app/attendance.py` - Attendance management
- `app/employee.py` - Employee management
- `app/leave_requests.py` - Leave request handling
- `app/leave_schedule.py` - Schedule parsing
- `app/flex_cards.py` - LINE Flex messages
- `app/knowledge.py` - Knowledge base
- `app/image_ocr.py` - Image OCR
- `app/prompt_loader.py` - Prompt loading
- `app/sync.py` - Data synchronization

### AI Provider Architecture

The Next.js app uses a unified AI provider system (`src/lib/ai-provider-unified.ts`) with automatic failover:

**Providers:**
- `GLMProvider` - Primary GLM API (glm-4.7-coding-max with glm-4-flash fallback)
- `LocalFallbackProvider` - Local rule-based engine when API unavailable

**Features:**
- Multi-API key load balancing with automatic rotation on auth errors
- Exponential backoff retry (max 3 retries, 10s max delay)
- 60-second timeout for API requests
- Streaming and non-streaming chat modes
- Provider status indicators in AI Assistant UI (Online/後備模式/離線)

**Unified AI Assistant** (`src/lib/unified-ai-assistant.ts`):
- Integrates GLM API with LINE Bot and voice chat
- Permission system integration (`src/lib/permission-system.ts`)
- Intent analysis and response generation for LINE Bot
- Schedule parsing and leave request handling
- Conversation history management

**Usage:**
```typescript
import { getAIManager } from '@/lib/ai-provider-unified'

const aiManager = getAIManager()
const response = await aiManager.chat(message, history)
console.log('Provider:', aiManager.getCurrentProviderName())

// Or use UnifiedAIAssistant for LINE/Voice
import { UnifiedAIAssistant } from '@/lib/unified-ai-assistant'
const assistant = new UnifiedAIAssistant()
const response = await assistant.processMessage(message, context)
```

**Environment Variables:**
- `GLM_API_KEYS` - Comma-separated API keys for load balancing
- `GLM_API_KEY` - Single API key (legacy)
- `GLM_MODEL` - Model name (default: `glm-4.7-coding-max`)

### Voice & Speech Features

The app supports comprehensive voice input and output for elderly users:

**Components:**
- `VoiceInput` - Speech-to-text button using Web Speech API
- `VoiceSynthesis` - Text-to-speech using Web Speech Synthesis API
- `VoiceConversation` - Continuous dialogue mode with state machine
- `ImmersiveVoiceChat` - Full-screen voice chat experience

**Voice Recognition:**
- Smart language detection: zh-CN for iOS Safari, zh-TW for others
- Microphone permission handling with user-friendly error messages
- Interim results display with confidence scores
- Automatic voice correction (`src/lib/voice-correction.ts`)

**Voice Features:**
- Web Speech API (SpeechRecognition + SpeechSynthesis)
- Natural TTS with intelligent text processing
- Voice state machine for managing conversation states
- Audio waveform visualization (`AudioWaveform` component)

**Taiwan Voice Services Integration:**
- **Eightwai** (`eightwai`): Taiwan voice service provider
- **Zero800**: Incoming call detection and display
- **Call Display Service**: WebSocket-based real-time call notifications
- **Webhook handling**: Incoming call processing with automatic customer lookup

**Usage Example:**
```typescript
import { VoiceInput } from '@/components/VoiceInput'

<VoiceInput
  onTextInput={(text) => setInputValue(text)}
  onError={(error) => showMessage(`麥克風錯誤：${error}`)}
  disabled={isLoading}
/>
```

### Project Structure

```
src/
├── app/
│   ├── layout.tsx         # iOS meta tags, Noto Sans TC font, PWA manifest
│   ├── page.tsx           # Main dashboard with SPA navigation
│   ├── globals.css        # iOS typography (18px+), safe areas, touch targets
│   └── api/               # API routes (CRUD operations)
├── components/
│   ├── *.tsx              # Feature components (Customer, Order, Inventory...)
│   ├── ui/                # shadcn/ui components + ios-* components
│   │   ├── ios-button.tsx   # Haptic feedback buttons
│   │   ├── ios-input.tsx    # Prevents auto-zoom
│   │   ├── ios-card.tsx     # Large touch targets
│   │   ├── ios-tabbar.tsx   # Bottom navigation
│   │   ├── ios-modal.tsx    # iOS-style modals
│   │   ├── ios-sheet.tsx    # Bottom sheets
│   │   ├── ios-switch.tsx   # iOS toggles
│   │   └── ios-alert.tsx    # Alert dialogs
│   ├── BrandIcon.tsx      # BRAND ICON - USE THIS FOR ALL ICONS
│   └── IOSTabBar.tsx      # Mobile bottom navigation
├── lib/
│   ├── db.ts              # Prisma client singleton
│   ├── ios-utils.ts       # Haptic feedback, safe areas, device detection
│   └── utils.ts           # cn() class merging
└── hooks/                 # Custom React hooks
```

### Next.js App Router Patterns

- **All pages are client components**: Use `'use client'` directive at top of app files
- **Disable prerendering**: Add `export const dynamic = 'force-dynamic'` to prevent SSR issues

### Navigation Pattern (Hybrid SPA)

The app uses **client-side section switching** - NOT Next.js routing:

```typescript
// In src/app/page.tsx
const [activeSection, setActiveSection] = useState<Section>('dashboard')

// Desktop: Fixed sidebar
// Mobile: Bottom tab bar (IOSTabBar) + slide-out menu for "更多"

type Section = 'dashboard' | 'customers' | 'orders' | 'inventory' | 'checks' | 'costs' | 'marketing' | 'reports' | 'meter' | 'staff' | 'calls' | 'monthly' | 'linebot' | 'excel-export' | 'chat'
```

**Bottom Tab Bar (Mobile):**
- First 4 items: 首頁, 訂單, 客戶, 庫存
- 5th item: "更多" opens slide-out menu with remaining items

**To add a new feature:**
1. Create component in `src/components/MyFeature.tsx`
2. Add to `menuItems` array in `page.tsx`
3. Add case in `renderSection()` switch statement

### Database Models (Core)

**Key models:**
- `User` - Staff (role: admin, staff, driver, accountant)
- `Customer` - Customers with `paymentType` (cash vs monthly)
- `Product` - Gas tanks, stoves, water heaters
- `GasOrder` + `GasOrderItem` - Orders with items
- `Inventory` - Stock levels with `minStock` alerts
- `Check` - Check deposits (status: pending, deposited, cleared...)
- `MonthlyStatement` - Monthly billing for monthly payment customers
- `LineGroup` + `LineMessage` + `LineConversation` - LINE Bot integration
- `AuditLog` - Enterprise audit trail for all critical operations

**Driver/Fleet Management:**
- `DriverLocation` - GPS tracking for drivers (with speed, heading, accuracy)
- `DispatchRecord` - Order dispatch status (pending → accepted → on_way → arrived → completed)
- `DeliveryRecord` - Delivery confirmation with signatures

**External Integrations:**
- `ExternalSystem` - Webhook configurations for accounting/ERP systems
- `WebhookLog` - Webhook delivery logs with retry tracking
- `AccountingSync` - Sync status for external accounting systems

## iOS Optimization Requirements

### Typography System (All larger than default)
- `.text-easy-title` - 31.5px (headings)
- `.text-easy-heading` - 27px
- `.text-easy-body` - 18px (BASE body text)
- `.text-easy-caption` - 15.75px

### Touch Targets
- Buttons: 52px min height (`.button-easy-touch`)
- Inputs: 52px min height (`.input-easy-touch`)
- List items: 64px min height (`.list-item-easy`)

### iOS Components (Use these instead of standard UI)
- `<IOSButton>` - Has haptic feedback built-in
- `<IOSInput>` - Prevents auto-zoom
- `<IOSCard>` + `<IOSListItem>` - Proper touch targets
- `<IOSTabBar>` - Bottom navigation for mobile
- `<BrandIcon>` - ALWAYS use for branding (never lucide-react Flame)

### Haptic Feedback
```typescript
import { triggerHaptic } from '@/lib/ios-utils'

triggerHaptic('light')     // Tap feedback
triggerHaptic('medium')    // Confirmation
triggerHaptic('success')   // Success
triggerHaptic('error')     // Error
```

**Available haptic types:** `light`, `medium`, `heavy`, `success`, `warning`, `error`, `selection`, `impact`, `transform`, `notification`, `path`

### Advanced iOS Gestures & Feedback

All gesture hooks are in `@/lib/ios-utils.ts` and include built-in haptic feedback:

**Gesture Hooks:**
```typescript
import {
  useSwipeGesture,    // Left/right/up/down detection
  usePinchGesture,    // Pinch to zoom
  useRotateGesture,   // Two-finger rotation
  usePanGesture,      // Drag/drop panning
  useDoubleTap,       // Double-tap detection
  useLongPress,       // Long press gestures
  useTouchFeedback    // Visual scale + haptic
} from '@/lib/ios-utils'

// Example: Swipe gesture
const { swipeGestureProps } = useSwipeGesture(
  () => console.log('swiped left'),
  () => console.log('swiped right'),
  () => console.log('swiped up'),
  () => console.log('swiped down'),
  50  // threshold in px
)

// Example: Long press (500ms default)
const { longPressProps } = useLongPress(() => {
  console.log('long pressed')
}, 500)
```

**Advanced Feedback:**
```typescript
// Sequential haptic patterns
triggerHapticSequence(['light', 'medium', 'success'], 100)

// Context-aware haptics (auto-adjusts intensity by velocity)
triggerAdaptiveHaptic('swipe', 1500)  // scroll|swipe|tap|hold|drag

// Combined haptic + sound
triggerFeedback('success', 'success')

// Sound only (Web Audio API)
playSound('success', 0.3)  // success|error|warning|tap|click|notification
```

**iOS Utilities:**
```typescript
import {
  preventOverscroll,     // Prevent rubber-band scrolling
  dismissKeyboard,       // Dismiss iOS keyboard
  isKeyboardOpen,        // Check if keyboard is visible
  flashScreen,           // Visual flash feedback
  getSafeAreaInsets,     // Get notch/home indicator sizes
  getStatusBarHeight,    // Status bar height in px
  getHomeIndicatorHeight,// Home indicator height in px
  useOrientationChange,  // Listen for rotation
} from '@/lib/ios-utils'
```

## PWA & iOS Web App Configuration

The app is configured as a Progressive Web App optimized for iOS Safari:

**PWA Manifest** (`public/manifest.json`):
- Display mode: `standalone` (hides browser UI)
- Orientation: `portrait` only
- Theme color: `#f97316` (orange)
- Icon sizes: 192x192, 512x512 + favicon
- Categories: business, productivity
- Language: zh-TW

**iOS-Specific Meta Tags** (in `layout.tsx`):
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="瓦斯行" />
<meta name="viewport" content="viewport-fit=cover, user-scalable=no" />
<meta name="format-detection" content="telephone=no,address=no,email=no" />
```

**iOS Web App Features:**
- Add to Home Screen capability
- Custom startup image support
- Safe area insets handling (notch + home indicator)
- Prevents auto-detection of phone numbers/addresses
- Disables zooming and rubber-band scrolling

**Font Loading:**
- Noto Sans TC (400, 500, 700, 900 weights)
- Preloaded with `display: swap`
- Google Fonts preload for faster rendering

## Important Constraints

1. **Brand Icon**: NEVER use `Flame` icon - ALWAYS use `<BrandIcon size={24} />`
2. **No Errors Allowed**: Elderly users cannot recover from errors
3. **Language**: All UI text in Traditional Chinese (zh-TW)
4. **Font**: Noto Sans TC only (defined in layout.tsx)
5. **React Strict Mode**: Disabled in next.config.ts (do not enable without testing)

## Authentication

### JWT Authentication Flow

The app uses JWT authentication with Edge Runtime compatible middleware:

**Middleware** (`src/middleware.ts`):
- Uses Web Crypto API for JWT decoding (Edge Runtime compatible)
- Validates tokens from cookies or Authorization header
- Adds user info (`x-user-id`, `x-user-username`, `x-user-role`) to request headers
- Public paths: `/login`, `/api/auth/*`, `/api/init`
- API routes receive user context via headers (actual validation in API routes)

**Client-side Storage:**
- `auth_token` - JWT token
- `user_name` - User's display name
- `user_role` - User's role (admin, staff, driver, accountant)

**API Routes:**
- Read user info from `x-user-*` headers set by middleware
- Perform additional validation as needed

**Default Admin Accounts** (created by `prisma/seed.ts`):
| Username | Password | Name | Role |
|----------|----------|------|------|
| admin | Uu19700413 | 老闆娘 | admin |
| bossjy | ji394su3@@ | BossJy | admin (超級管理員) |
| kai801129 | 520520@@ | Kai | admin |
| tian1111 | tian1111 | Tian | admin |

**Important:** Only `role: 'admin'` can create new employee accounts via `/api/auth/register`

## Environment Configuration

### Environment Variables (Vercel/Production)

**Database:**
- `DATABASE_URL` - PostgreSQL connection string (Supabase for Vercel)
- `DIRECT_URL` - Direct connection URL for Supabase

**JWT:**
- `JWT_SECRET` - Secret key for JWT signing (must match `src/middleware.ts`)

**AI:**
- `GLM_API_KEYS` - Comma-separated API keys for load balancing
- `GLM_API_KEY` - Single API key (legacy)
- `GLM_MODEL` - Primary AI model (default: `glm-4.7-coding-max`)

**LINE Bot:**
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE Bot access token
- `LINE_CHANNEL_SECRET` - LINE Bot secret for webhook verification

**Supabase (Vercel deployment):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

**Other Services:**
- `VOICE_PROVIDER` - Voice service provider (`eightwai` or `zero800`)
- `VOICE_API_KEY` - Voice service API key

### Python Service Environment (`line_bot_ai/`)

The Python FastAPI service uses `config.py` to load environment variables:

Required variables (see `line_bot_ai/.env`):
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE Bot token
- `LINE_CHANNEL_SECRET` - LINE Bot secret
- `GLM_API_KEY` - GLM API key
- `GLM_MODEL` - Model name (default: `glm-4.7-coding-max`)
- `HOST` - Service host (default: `0.0.0.0`)
- `PORT` - Service port (default: `9999`)
- `LOG_LEVEL` - Logging level (default: `INFO`)
- `LOG_FILE` - Log file path
- `TMP_AUDIO_DIR` - Temporary audio directory

### Build Configuration

**Next.js (`next.config.mjs`):**
- TypeScript errors ignored: `typescript: { ignoreBuildErrors: true }`
- ESLint errors ignored: `eslint: { ignoreDuringBuilds: true }`
- React Strict Mode disabled: `reactStrictMode: false`
- Standalone output disabled for Vercel: `// output: "standalone"` (commented out)
- Webpack path alias configured: `@` → `src`

**Vercel (`vercel.json`):**
- Framework: `nextjs`
- Region: `hkg1` (Hong Kong)
- Install: `npm install --legacy-peer-deps`
- Function timeouts: 60s default, 120s for AI/voice routes

### Python Service Dependencies (`line_bot_ai/requirements.txt`)
```
fastapi
uvicorn
requests
python-dotenv
line-bot-sdk
zhipuai
```

**Python Docker Image:** `python:3.11-slim` with `ffmpeg` for Whisper ASR support

## API Development Patterns

### Next.js API Routes

When creating new API routes in `src/app/api/`:

```typescript
'use client'
export const dynamic = 'force-dynamic'  // Always add this

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  // Get user info from middleware headers
  const userId = request.headers.get('x-user-id')
  const userRole = request.headers.get('x-user-role')

  // Check permissions if needed
  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Your logic here
  const data = await db.customer.findMany()

  return NextResponse.json({ data })
}
```

### Python FastAPI Routes

When adding routes to the Python service:

```python
from fastapi import APIRouter, Request
from line_bot_ai.config import config

router = APIRouter(prefix="/api/your-feature", tags=["your-feature"])

@router.post("/action")
async def your_action(request: Request):
    # Access config
    api_key = config.GLM_API_KEY

    # Your logic here
    return {"success": True}
```

Then register in `main.py`:
```python
from your_module import router as your_router
app.include_router(your_router)
```

## Troubleshooting

### Local Development Issues
- **Port 9999 already in use**: Kill the process before starting dev server
  ```bash
  # Windows: Find and kill process on port 9999
  netstat -ano | findstr :9999
  taskkill /PID <PID> /F
  ```
- **Don't use Docker for local development**: Run `npm run dev` directly, not via docker-compose
- **Changes not reflecting**: Make sure to kill and restart the dev server after code changes

### Common Issues (Next.js)
- **Icons not showing**: Use `<BrandIcon>` instead of any Flame icon from lucide-react
- **Haptics not working**: Import from `@/lib/ios-utils` and call `triggerHaptic()`
- **Gestures not responding**: Make sure to spread the gesture props (`{...swipeGestureProps}`) onto your touchable elements
- **iOS zoom on input focus**: Use `<IOSInput>` instead of standard input elements
- **Rubber-band scrolling**: Use `preventOverscroll(element)` on scrollable containers
- **Mobile navigation**: Uses client-side state (`activeSection`), not Next.js routing
- **Auth redirects**: Check localStorage for `auth_token`, `user_name`, `user_role`

### Docker Issues (Python Service)
- **Container won't start**: Check Docker logs with `docker-compose logs line-bot-ai`
- **LINE webhook not working**: Verify `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_CHANNEL_SECRET`
- **AI not responding**: Check `GLM_API_KEY` is valid and `GLM_MODEL` is accessible
- **Port conflicts**: The service uses port 9999

### Build Issues
- **TypeScript errors during build**: These are ignored by default (see next.config.mjs)
- **Vercel deployment fails**: Check that `installCommand` uses `--legacy-peer-deps`
- **Environment variables not available**: Verify all required vars are set in Vercel dashboard

### Authentication Issues
- **Middleware JWT mismatch**: The JWT secret in `src/middleware.ts` (hardcoded as `9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY=`) must match your `JWT_SECRET` environment variable
- **Middleware runs on Edge Runtime**: Cannot read .env files directly, hence the hardcoded secret. If you change JWT_SECRET, you must update `src/middleware.ts` line 11
- **401 errors on API routes**: Check that middleware is setting `x-user-*` headers correctly
- **Login not persisting**: Verify cookies are being set and browser is not blocking them

### Database Issues
- **Prisma client not generated**: Run `npm run db:generate`
- **Migration conflicts**: Use `npm run db:push` for development instead of migrations
- **Connection pool exhausted**: Check DATABASE_URL has proper pooling configuration for Supabase

## Key Library Files

### Core Libraries (`src/lib/`)

These files contain critical business logic and utilities:

- **`db.ts`** - Prisma client singleton (must use this for all DB operations)
- **`ios-utils.ts`** - iOS-specific utilities:
  - Device detection (`isIOS()`, `isIPad()`, `isIPhone()`)
  - Haptic feedback (`triggerHaptic()`, `triggerHapticSequence()`, `triggerAdaptiveHaptic()`)
  - Gesture hooks (`useSwipeGesture()`, `useLongPress()`, `usePinchGesture()`, etc.)
  - Safe area utilities (`getSafeAreaInsets()`, `getStatusBarHeight()`)
  - Keyboard utilities (`dismissKeyboard()`, `isKeyboardOpen()`)

- **`ai-provider-unified.ts`** - Unified AI provider management:
  - Multi-provider support (GLM, local fallback)
  - Load balancing across multiple API keys
  - Retry logic with exponential backoff
  - Streaming and non-streaming modes

- **`unified-ai-assistant.ts`** - High-level AI assistant:
  - Integrates AI with LINE Bot and voice features
  - Permission system integration
  - Intent analysis and response generation
  - Schedule and leave request parsing

- **`permission-system.ts`** - User permission management:
  - Role-based access control
  - Group permissions (LINE groups)
  - User context retrieval

- **`voice-correction.ts`** - Voice recognition error correction:
  - Common word mapping for Taiwan gas industry
  - Number conversions (台 -> 桶)
  - Simplified to Traditional Chinese conversion

- **`line-bot-intent.ts`** - LINE Bot intent analysis
- **`line-bot-response.ts`** - LINE Bot response generation
- **`line-group-manager.ts`** - LINE group management
- **`line-customer-linker.ts`** - LINE user to customer linking
- **`schedule-parser.ts`** - Employee schedule/leave parsing
- **`notification-service.ts`** - Notification sending service

### Important API Routes (`src/app/api/`)

Key endpoints to understand:

- **`/api/auth/*`** - Authentication (login, register, logout, me)
- **`/api/ai/chat`** - AI chat endpoint (streaming and non-streaming)
- **`/api/voice/*`** - Voice features (STT, TTS)
- **`/api/customers`** - Customer CRUD
- **`/api/orders`** - Order management
- **`/api/inventory`** - Inventory management
- **`/api/init`** - Database initialization
- **`/api/webhook/line`** - LINE Bot webhook (Next.js side)

### Python Service Key Files (`line_bot_ai/`)

- **`config.py`** - Configuration management with validation
- **`main.py`** - FastAPI app setup with CORS and lifespan
- **`line_webhook.py`** - LINE webhook router
- **`ai_glm47.py`** - GLM-4.7 AI client
- **`app/main.py`** - Main route handlers
- **`app/ai_handler.py`** - AI request processing
- **`app/leave_schedule.py`** - Schedule parsing logic
- **`app/flex_cards.py`** - LINE Flex message templates
