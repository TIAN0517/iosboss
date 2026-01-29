# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**九九瓦斯行管理系統** (Jiu Jiu Gas Station Management System) - A comprehensive gas station management system with iOS-style mobile UI, designed for local deployment with cloud backup.

**Technology Stack:**
- **Frontend**: Next.js 14 (App Router), React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui
- **UI Framework**: Custom iOS-style components (`ios-*` prefix), Radix UI primitives
- **Backend**: Next.js API Routes, Prisma ORM
- **Databases**: PostgreSQL (primary/local), Supabase (cloud backup)
- **Authentication**: JWT-based with custom middleware (`src/middleware.ts`)
- **State Management**: Zustand (client), React Query (`@tanstack/react-query`) (server)

## Development Commands

```bash
# Start development server (port 9999)
npm run dev

# Database operations
npm run db:setup      # Generate + push + seed
npm run db:push       # Push schema changes
npm run db:migrate    # Run migrations
npm run db:seed       # Seed database
npm run db:generate   # Generate Prisma client
npm run db:reset      # Reset database (dev only)
npm run db:add-historical-attendance  # Add historical attendance records

# Build
npm run build         # Prisma generate + Next.js build (ignores TypeScript/ESLint errors)
npm run build:standalone  # Build standalone production bundle
npm run start         # Run standalone server

# Docker
docker-compose up     # Start all services
```

**Port Configuration:**
- Next.js: `9999` (configured in `.env` as `PORT=9999`)
- PostgreSQL: `5432`

## Architecture

### Directory Structure

```
├── app/                      # Next.js App Router pages (legacy, prefer src/)
├── src/
│   ├── app/                  # Source App Router pages
│   │   ├── api/              # API routes (auth, webhooks, health)
│   │   ├── layout.tsx        # Root layout with iOS meta tags
│   │   └── page.tsx          # Main dashboard
│   ├── components/
│   │   ├── ui/               # shadcn/ui + custom iOS components
│   │   │   ├── ios-*         # iOS-style components (Modal, Sheet, TabBar, etc.)
│   │   │   ├── Pagination.tsx # Pagination component
│   │   │   └── *.tsx         # Radix UI components (Dialog, Dropdown, etc.)
│   │   ├── *Management.tsx   # Feature modules (Customer, Order, Product, etc.)
│   │   ├── providers/        # Context providers
│   │   │   └── QueryProvider.tsx  # React Query provider
│   │   └── AIAssistant.tsx   # AI chat interface
│   ├── hooks/                # Custom React hooks
│   │   ├── useApi.ts         # React Query data fetching hooks
│   │   ├── useToast.ts       # Toast notification hooks
│   │   └── useFormValidation.ts  # Form validation hooks
│   ├── lib/
│   │   ├── database/
│   │   │   ├── repositories/ # Repository pattern (BaseRepository, CustomerRepository, etc.)
│   │   │   └── services/     # Business logic (AuditLog, WebhookSync, etc.)
│   │   ├── integration/      # External system integrations (MSSQL, webhook)
│   │   ├── prisma.ts         # Prisma client singleton
│   │   ├── validators.ts     # Zod validation schemas
│   │   └── *-service.ts      # Various service modules
│   └── middleware.ts         # JWT auth middleware
├── prisma/
│   ├── schema.prisma         # Database schema (30+ models)
│   └── seed.ts              # Database seeding
├── company-sync/             # MSSQL sync tool for legacy systems
├── docs/                     # Configuration guides
└── scripts/                  # Deployment and utility scripts
```

### Key Architecture Patterns

**1. Repository Pattern** (`src/lib/database/repositories/`)
- BaseRepository with common CRUD operations
- Entity-specific repositories (Customer, Order, Product, etc.)
- All database access goes through repositories

**2. Service Layer** (`src/lib/database/services/`)
- Business logic separation
- AuditLog, WebhookSync, AccountingSync, CustomerService
- Services use repositories for data access

**3. Authentication Flow**
- JWT tokens stored in `auth_token` cookie
- Middleware (`src/middleware.ts`) validates tokens for pages
- API routes handle their own auth
- Public paths: `/login`, `/api/simple-auth`, `/api/auth-logout`, `/api/auth-me`, `/api/auth/init-admin`
- **User info headers**: When authenticated, middleware adds these headers to requests:
  - `x-user-id`: User ID
  - `x-user-username`: Username
  - `x-user-role`: User role
- API routes can read these headers instead of re-parsing the JWT token

**4. Dual API Structure**
- Both `app/api/` and `src/app/api/` exist
- **Prefer `src/app/api/`** for new API routes
- Old `app/api/` routes are maintained for compatibility

**5. External Integrations**
- **company-sync/**: Syncs from legacy MSSQL systems via webhook
- **Supabase**: Cloud backup (read-only for reports)
- Webhook system for external system notifications

## Database Schema (Key Models)

The Prisma schema has **30+ models**. Key entities:

- **User**: Staff accounts with roles
- **Customer**: Customer records with groups, credit limits
- **GasOrder**: Orders with items, delivery tracking
- **Product**: Products with categories, pricing
- **Inventory**: Stock levels with alerts
- **KnowledgeBase**: AI knowledge base with embeddings
- **LineGroup/LineMessage**: LINE Bot integration
- **AuditLog**: System audit trail
- **ScheduleSheet/EmployeeSchedule**: Employee scheduling
- **AttendanceRecord**: Employee attendance

**Note**: The schema includes legacy table models (`customers`, `gas_orders`, etc.) for company integration - these use `BigInt` autoincrement IDs vs CUID IDs for main models.

## API Routes

The system has **100+ API endpoints** across two directories. `src/app/api/` is preferred for new routes.

### `app/api/` (Legacy - Maintain Only)

#### 🔐 Authentication
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/register` | POST | User registration |
| `/api/auth/self-register` | POST | Self-registration |
| `/api/auth/me` | GET | Current user info |
| `/api/auth/init-admin` | POST | Initialize admin |
| `/api/auth/create-super-admin` | POST | Create super admin |

#### 👥 Customers & Groups
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/customers` | GET, POST | List/create customers |
| `/api/customers/[id]` | GET, PUT, DELETE | Customer details |
| `/api/customer-groups` | GET, POST | Customer groups |
| `/api/monthly-statements` | GET, POST | Monthly statements |
| `/api/call-records` | GET, POST | Call records |

#### 📦 Orders & Products
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/orders` | GET, POST | List/create orders |
| `/api/orders/[id]` | GET, PUT, DELETE | Order details |
| `/api/products` | GET, POST, PUT | Products |
| `/api/promotions` | GET, POST | Promotions |
| `/api/inventory` | GET, POST | Inventory |
| `/api/inventory/transactions` | GET, POST | Inventory transactions |
| `/api/alerts` | GET, POST | Inventory alerts |

#### 💰 Finance
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/checks` | GET, POST | Checks |
| `/api/checks/[id]` | GET, PUT, DELETE | Check details |
| `/api/costs` | GET, POST | Cost records |
| `/api/cost-analysis` | GET | Cost analysis |
| `/api/meter-readings` | GET, POST | Meter readings |

#### 🔄 Sync & Integration
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/sync/status` | GET | Sync status |
| `/api/sync/upload` | POST | Upload sync |
| `/api/sync/download` | GET | Download sync |
| `/api/sync/full` | POST | Full sync |
| `/api/sync/excel` | POST | Excel sync |
| `/api/sync/accounting` | POST | Accounting sync |
| `/api/sync/company/webhook` | POST | Company webhook (secret: `jyt-gas-webhook-2024`) |
| `/api/external-systems` | GET, POST | External systems |
| `/api/webhook-logs` | GET | Webhook logs |

#### 📝 Scheduling & Attendance
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/sheets` | GET, POST | Schedule sheets |
| `/api/sheets/[id]` | GET, PUT, DELETE | Schedule details |
| `/api/sheets/[id]/review` | POST | Review schedule |
| `/api/sheets/today` | GET | Today's schedule |

#### 🚚 Fleet & Delivery
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/fleet/dispatch` | POST | Dispatch drivers |
| `/api/fleet/drivers/location` | POST | Update driver location |
| `/api/vehicle-express` | POST | Vehicle express |

#### 🤖 LINE Bot
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/linebot` | GET, POST | LINE bot control |
| `/api/linebot/send` | POST | Send message |
| `/api/linebot/groups` | GET | LINE groups |
| `/api/notifications/line` | POST | LINE notifications |
| `/api/webhook/line` | POST | LINE webhook |
| `/api/webhook/line/debug` | POST | LINE debug |

#### 🎤 Voice Services
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/voice/tts` | POST | Text-to-speech |
| `/api/voice/stt` | POST | Speech-to-text |
| `/api/voice/realtime` | WebSocket | Realtime voice |
| `/api/test-tts` | GET | Test TTS |

#### 🧠 AI & Knowledge
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/chat` | POST | AI chat |
| `/api/knowledge` | GET, POST | Knowledge base |

#### 🔧 Diagnostics
| Route | Methods | Description |
|-------|---------|-------------|
| `/api/health` | GET | Health check |
| `/api/health/check` | GET | Health check |
| `/api/init` | POST | System initialization |
| `/api/diag/login` | POST | Diagnostic login |
| `/api/diag/db` | GET | Database diagnostics |
| `/api/database/[table]` | GET, POST | Generic table CRUD |
| `/api/database/[table]/[id]` | GET, PUT, DELETE | Generic table item |
| `/api/logs` | GET | System logs |
| `/api/logs/stats` | GET | Log statistics |

### `src/app/api/` (Preferred - Use for New Routes)

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/login` | POST | Login |
| `/api/auth/register` | POST | Register |
| `/api/customers` | GET, POST | Customers |
| `/api/customers/[id]` | GET, PUT, DELETE | Customer details |
| `/api/orders` | GET, POST | Orders |
| `/api/orders/[id]` | GET, PUT, DELETE | Order details |
| `/api/products` | GET, POST | Products |
| `/api/product-categories` | GET, POST | Product categories |
| `/api/inventory` | GET, POST | Inventory |
| `/api/checks` | GET, POST | Checks |
| `/api/checks/[id]` | GET, PUT, DELETE | Check details |
| `/api/staff` | GET, POST | Staff |
| `/api/staff/[id]` | GET, PUT, DELETE | Staff details |
| `/api/costs` | GET, POST | Costs |
| `/api/monthly` | GET | Monthly reports |
| `/api/calls` | GET, POST | Call records |
| `/api/marketing` | GET, POST | Marketing |
| `/api/schedules` | GET, POST | Schedules |
| `/api/reports` | GET | Reports |
| `/api/ecommerce/cart` | GET, POST | Shopping cart |
| `/api/ecommerce/checkout` | POST | Checkout process |
| `/api/ecommerce/orders` | GET, POST | Shop orders |
| `/api/ecommerce/orders/[orderNo]` | GET | Order details |
| `/api/ecommerce/coupons` | GET, POST | Coupons |
| `/api/ecommerce/products/reviews` | GET, POST | Product reviews |
| `/api/ai/chat` | POST | AI chat |
| `/api/health` | GET | Health check |
| `/api/database` | GET | Database operations |
| `/api/webhook/line` | POST | LINE webhook |

### Public Routes (No Auth Required)

- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/register`
- `/api/auth/me`
- `/api/auth/init-admin`
- `/api/simple-auth`
- `/api/health`
- `/api/health/check`
- `/api/init`

All other routes require JWT authentication via `auth_token` cookie or `Authorization: Bearer <token>` header.

## Important Configuration

### Environment Variables (.env)

Required variables:
```bash
PORT=9999
DATABASE_URL=postgresql://...
JWT_SECRET=9hg8PlHMFswnN7FZyfxHOagwqyJ87lZVXQFDKRBc+GY=
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Middleware Authentication

The JWT_SECRET in `src/middleware.ts:11` must match `.env`. Middleware runs in Edge Runtime, so the secret is duplicated there.

### Build Configuration

`next.config.mjs` has TypeScript and ESLint errors **ignored** during build. This is intentional for deployment speed.

**Vercel Deployment**: The `output: "standalone"` option is commented out to allow Vercel to use its default deployment mode. For PM2/local production, you may need to uncomment this and run `npm run build:standalong`.

## iOS-Style Components

The app uses custom iOS-style components in `src/components/ui/ios-*`:
- **Modal**: Bottom sheet modals
- **Sheet**: Slide-up panels
- **TabBar**: iOS-style tab navigation
- **ActionSheet**: iOS-style action menus
- Haptic feedback system
- Safe area handling for notched devices

## Development Notes

1. **Large component files**: `src/app/page.tsx` is 1000+ lines - consider modularization when making changes

2. **Traditional Chinese**: UI text is Traditional Chinese (TW)

3. **Local-first architecture**: Primary database is local PostgreSQL, Supabase is for backup only

4. **No line_bot_ai**: The Python LINE Bot service files have been removed (see git status - `AD line_bot_ai/`). The AI functionality has been moved to a separate service on port 8888.

5. **Path aliases**: `@` maps to `src/` (configured in `next.config.mjs`)

6. **Prisma client**: Always use the singleton from `src/lib/prisma.ts`

7. **Edge Runtime middleware**: JWT_SECRET is duplicated in `src/middleware.ts` because middleware runs in Edge Runtime and cannot access `.env` at runtime. When updating JWT_SECRET, you must update both `.env` AND `src/middleware.ts:11`.

8. **React Query hooks**: Use `src/hooks/useApi.ts` for data fetching. It provides cached queries and automatic refetching.

9. **Toast notifications**: Use `src/hooks/useToast.ts` instead of `alert()` for user feedback.

10. **Form validation**: Use `src/lib/validators.ts` (Zod schemas) and `src/hooks/useFormValidation.ts` for client-side validation.

11. **API pagination**: All list APIs now return `{ data, pagination }` format with `page`, `limit`, `total`, `totalPages`, `hasNextPage`, `hasPrevPage`.

12. **Database transactions**: Always use `db.$transaction()` for operations that modify multiple tables (e.g., inventory updates with transaction logs).

## Deployment

See **DEPLOYMENT.md** for detailed deployment guide including Cloudflare Tunnel configuration.

**Local Development**:
```bash
npm run dev
```

**Production (PM2)**:
```bash
npm run build
pm2 start ecosystem.config.js
```

**Production (PM2 with logs)**:
```bash
npm run build
pm2 start ecosystem.config.js
pm2 logs gas-station-dev
```

**Docker** (Python AI service only - line_bot_ai has been removed):
```bash
# Note: docker-compose.yml is for legacy line_bot_ai service only
# The main Next.js app runs natively on port 9999
docker-compose up
```

**Public URLs** (from STABLE_SETUP.md):
- Backend: https://bossai.tiankai.it.com
- LINE Bot: https://linebot.tiankai.it.com/api/webhook/line

### Service Architecture

The system uses a dual-service architecture:

| Service | Port | Purpose |
|---------|------|---------|
| Next.js Backend | **9999** | Main app, Web UI, API, Database access |
| Python AI Service | **8888** | LINE Bot webhook, GLM-4.7 AI (via Next.js API) |
| PostgreSQL | **5432** | Database |

**Important**: Python AI service communicates with Next.js via HTTP API (`http://localhost:9999`) - it does NOT connect directly to the database. This maintains a single data source.

**Startup Order**: PostgreSQL → Next.js (9999) → Python AI (8888)

## Testing

No automated tests are currently configured. When adding tests, place them in `__tests__/` or use the `*.test.ts` / `*.spec.ts` convention.

## Troubleshooting

**Port 9999 in use?**
- Check: `netstat -ano | findstr ":9999"`
- The dev server is configured to use port 9999

**Database connection issues?**
- Verify PostgreSQL is running on port 5432
- Check `DATABASE_URL` in `.env`

**Build TypeScript errors?**
- These are ignored in `next.config.mjs` (intentional)
- Fix critical errors before deployment

**Authentication not working?**
- Check JWT_SECRET matches in `.env` and `src/middleware.ts`
- Verify `auth_token` cookie is being set
- Public paths bypass middleware - see `publicPaths` array in middleware
