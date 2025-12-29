# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**九九瓦斯行管理系統** is an iOS-optimized PWA gas station management system for elderly users in Taiwan. Built with Next.js 15, designed for large touch targets, simplified workflows, and zero-error tolerance.

## Deployment

### Docker (Production - Recommended)

```bash
# Using deployment script (Linux/Mac)
./docker-deploy.sh start      # Start all services
./docker-deploy.sh logs       # View logs
./docker-deploy.sh status     # Check service status
./docker-deploy.sh stop       # Stop all services

# Using deployment script (Windows)
docker-deploy.bat start
docker-deploy.bat logs
docker-deploy.bat stop

# Or using docker-compose directly
docker-compose --env-file .env.docker up -d
```

**Services:**
- `app`: Next.js on port 9999 (auto-runs migrations on startup)
- `postgres`: PostgreSQL on port 5433
- `nginx`: Reverse proxy on port 80
- `cloudflared`: Cloudflare Tunnel for public access (optional)
- `backup`: Automated daily database backups (optional)
- `call-display-service`: Incoming call WebSocket service (optional)
- `sync-websocket-service`: Real-time sync WebSocket service (optional)

**Data volumes (Docker-managed):**
- `postgres_data` - Database
- `gas_data` - App data
- `nginx_cache` - Nginx cache

### Local Development

```bash
# Development server (port 9999, logs to dev.log)
# Both npm and bun work (bun has npm compatibility)
npm run dev    # or: bun run dev

# Build for production (includes copy-assets.js step)
npm run build  # or: bun run build

# Start production server (standalone mode)
npm start      # or: bun start

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

### Tech Stack
- **Framework**: Next.js 15 App Router (standalone output)
- **Database**: Prisma ORM + PostgreSQL
- **UI**: Tailwind CSS 4 + shadcn/ui (Radix)
- **State**: Zustand + TanStack Query
- **Icons**: Custom `<BrandIcon>` component ONLY (uses `/public/jyt.ico`)

### Third-Party Integrations
- **Socket.IO** (`socket.io` + `socket.io-client`) - Real-time features and live updates
- **z-ai-web-dev-sdk** - AI/voice chat features (GLM API integration)
- **xlsx** - Excel import/export functionality
- **@dnd-kit** - Drag and drop functionality for sortable lists
- **bcryptjs** - Password hashing for authentication

### Real-Time Features (Socket.IO)
The app uses Socket.IO for real-time updates:
- Order status changes
- Driver location updates
- Inventory alerts
- Notification broadcasts

Socket server is integrated with Next.js API routes.

### AI Provider Architecture

The app uses a unified AI provider system (`src/lib/ai-provider.ts`) with automatic failover:

**Providers:**
- `GLMProvider` - Primary GLM API (glm-4.7-coding-max with glm-4-flash fallback)
- `LocalFallbackProvider` - Local rule-based engine when API unavailable

**Features:**
- Multi-API key load balancing with automatic rotation on auth errors
- Exponential backoff retry (max 3 retries, 10s max delay)
- 60-second timeout for API requests
- Streaming and non-streaming chat modes
- Provider status indicators in AI Assistant UI (Online/後備模式/離線)

**Usage:**
```typescript
import { getAIManager } from '@/lib/ai-provider'

const aiManager = getAIManager()
const response = await aiManager.chat(message, history)
console.log('Provider:', aiManager.getCurrentProviderName())
```

**Environment Variables:**
- `GLM_API_KEYS` - Comma-separated API keys for load balancing
- `GLM_API_KEY` - Single API key (legacy)

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

- JWT tokens stored in localStorage (`auth_token`, `user_name`, `user_role`)
- Middleware passes auth headers to API routes
- Only `role: 'admin'` can create new employee accounts via `/api/auth/register`

**Default Admin Accounts** (created by seed.ts):
| Username | Password | Name | Role |
|----------|----------|------|------|
| admin | Uu19700413 | 老闆娘 | admin |
| bossjy | ji394su3@@ | BossJy | admin (超級管理員) |
| kai801129 | 520520@@ | Kai | admin |
| tian1111 | tian1111 | Tian | admin |

## Environment Configuration

### Docker (.env.docker)
- `DB_AUTO_MIGRATE=true` - Auto-run Prisma migrations on startup
- `DB_AUTO_SEED=true` - Auto-seed database on first run
- `POSTGRES_PASSWORD` - PostgreSQL password
- `GLM_API_KEYS` - AI service keys (comma-separated for load balancing)
- `GLM_MODEL` - Primary AI model (default: `glm-4.7-coding-max`)
- `LINE_CHANNEL_ACCESS_TOKEN` - LINE Bot token
- `LINE_CHANNEL_SECRET` - LINE Bot secret for webhook verification
- `VOICE_PROVIDER` - Voice service provider (`eightwai` or `zero800`)
- `VOICE_API_KEY` - Voice service API key
- `CF_TUNNEL_TOKEN` - Cloudflare Tunnel token for public exposure

### Important Build Notes
- Build includes `copy-assets.js` step after `next build` (copies public assets)
- TypeScript and ESLint errors are ignored during builds (see next.config.ts)
- React Strict Mode is **disabled** - do not enable without testing
- Output mode is `standalone` for Docker deployment

### Startup Scripts (Docker)
The Docker container runs a startup script that:
1. Runs Prisma migrations if `DB_AUTO_MIGRATE=true`
2. Seeds database if `DB_AUTO_SEED=true`
3. Starts the Next.js server on port 9999

### Cloudflare Tunnel Deployment
The app includes Cloudflare Tunnel for public access without port forwarding:
- `cloudflared` container connects to Cloudflare's network
- Traffic routes: Internet → Cloudflare → Tunnel → Nginx → Next.js app
- Configure `CF_TUNNEL_TOKEN` in `.env.docker` from Cloudflare Zero Trust dashboard
- Nginx handles SSL termination and reverse proxy

### API Development Patterns
When creating new API routes in `src/app/api/`:
```typescript
'use client'
export const dynamic = 'force-dynamic'  // Always add this

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Get auth token from header
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  // Check localStorage auth (client-side) or validate JWT
  // ... your logic

  return NextResponse.json({ data: 'response' })
}
```

## Troubleshooting

### Common Issues
- **Icons not showing**: Use `<BrandIcon>` instead of any Flame icon from lucide-react
- **Haptics not working**: Import from `@/lib/ios-utils` and call `triggerHaptic()`
- **Gestures not responding**: Make sure to spread the gesture props (`{...swipeGestureProps}`) onto your touchable elements
- **iOS zoom on input focus**: Use `<IOSInput>` instead of standard input elements
- **Rubber-band scrolling**: Use `preventOverscroll(element)` on scrollable containers
- **Mobile navigation**: Uses client-side state (`activeSection`), not Next.js routing
- **Auth redirects**: Check localStorage for `auth_token`, `user_name`, `user_role`

### Docker Issues
- **Container won't start**: Check Docker logs with `docker logs jyt-gas-app`
- **Database connection errors**: Ensure postgres container is healthy first
- **Port conflicts**: The app uses port 9999, PostgreSQL uses 5433 externally
- **Migration failures**: Check `DB_AUTO_MIGRATE` and `DB_AUTO_SEED` in `.env.docker`

### Build Issues
- **TypeScript errors during build**: These are ignored by default (see next.config.ts)
- **Assets not copying**: The `copy-assets.js` script runs after `next build`
- **Standalone output missing**: Ensure `output: "standalone"` in next.config.ts
