# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**BossJy Store Information Extraction System** - A web application for automatically searching, extracting, and managing store information (focused on Taiwan/Hualien businesses).

**Technology Stack:**
- **Framework**: Next.js 16 (App Router), TypeScript 5, Bun
- **Styling**: Tailwind CSS v4, shadcn/ui components
- **Database**: SQLite with Prisma ORM
- **AI Integration**: z-ai-web-dev-sdk (cloud API) and Ollama (local)
- **State Management**: React hooks, simple local state

## Development Commands

```bash
# Install dependencies
bun install

# Start development server (port 3000)
bun run dev

# Build for production
bun run build

# Start production server
bun start

# Database operations
bun run db:push       # Push schema changes (creates/updates SQLite DB)
bun run db:generate   # Generate Prisma client

# Reset database
rm -f db/custom.db && bun run db:push
```

**Port Configuration:**
- Next.js: `3000` (configured in `package.json`)

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── stores/       # Store CRUD operations
│   │   ├── search-stores/ # Store search endpoint
│   │   ├── stats/        # Statistics endpoint
│   │   ├── batch/        # Batch operations
│   │   ├── verify-line/  # LINE account verification
│   │   ├── extract-from-web/      # AI extraction (cloud API)
│   │   └── extract-from-web-ollama/ # AI extraction (Ollama)
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main dashboard (1000+ lines)
├── components/
│   └── ui/               # shadcn/ui components (45+ components)
├── hooks/
│   ├── use-toast.ts      # Toast notifications
│   └── use-mobile.ts     # Mobile detection
└── lib/
    ├── db.ts             # Prisma singleton
    ├── utils.ts          # Utility functions
    ├── ollama.ts         # Ollama client
    └── ai-sdk.ts         # z-ai-web-dev-sdk wrapper

prisma/
└── schema.prisma         # Database schema

db/
└── custom.db             # SQLite database (auto-created)
```

### Key Patterns

**1. Database Access**
- Always use the singleton from `src/lib/db.ts`
- SQLite file at `db/custom.db`
- Deduplication by phone number on store creation

**2. API Response Format**
- Most APIs return `{ success: boolean, data/error, ... }`
- Stores API includes full store objects with timestamps

**3. AI Extraction**
- Cloud API: `src/lib/ai-sdk.ts` → `/api/extract-from-web`
- Ollama local: `src/lib/ollama.ts` → `/api/extract-from-web-ollama`
- Both extract: name, phone, address, website, image, signboard, LINE, location

**4. LINE Verification**
- `/api/verify-line` endpoint for checking LINE account activity
- Stores have `lineActive` boolean and `lineVerifiedAt` timestamp

## Database Schema

```prisma
model Store {
  id            String   @id @default(cuid())
  name          String
  address       String?
  phoneNumber   String?
  website       String?
  signboard     String?
  imageUrl      String?   // Storefront photo
  lineAccount   String?
  location      String?   // Region (e.g., "花蓮縣")
  lineActive    Boolean?
  lineVerifiedAt DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([phoneNumber])
  @@index([location])
  @@index([lineActive])
}

model PhoneNumberVerification {
  id          String   @id @default(cuid())
  phoneNumber String
  lineActive  Boolean?
  verifiedAt  DateTime @default(now())
  notes       String?
  createdAt   DateTime @default(now())

  @@index([phoneNumber])
}
```

## API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/stores` | GET, POST | List/create stores (supports search, location, lineActive filters) |
| `/api/stores/[id]` | GET, PUT, DELETE | Single store operations |
| `/api/search-stores` | POST | Store search with filters |
| `/api/stats` | GET | Statistics dashboard |
| `/api/batch` | POST | Batch operations (save/delete multiple) |
| `/api/verify-line` | POST | Verify LINE account activity |
| `/api/extract-from-web` | POST | Extract store info (cloud AI) |
| `/api/extract-from-web-ollama` | POST | Extract store info (Ollama local) |
| `/api/extract-store-info` | POST | Extract from URL |
| `/api/export-stores` | GET | Export stores data |

## Environment Variables

Required in `.env`:
```bash
# Optional: Ollama (for local AI)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:7b

# Optional: z-ai-web-dev-sdk (for cloud AI)
Z_AI_API_KEY=your-api-key
```

## Key Features

1. **Auto Search**: 12 concurrent searches for store information
2. **AI Extraction**: Extract 8 fields (name, phone, address, website, photo, signboard, LINE, location)
3. **LINE Verification**: Check if LINE accounts are active
4. **Batch Operations**: Save/delete multiple stores at once
5. **Statistics Dashboard**: Overview of stored data quality
6. **Data Export**: Export stores to external systems

## Development Notes

1. **Main Component**: `src/app/page.tsx` is large (1000+ lines) - contains all UI logic
2. **UI Components**: Uses shadcn/ui - components are pre-built in `src/components/ui/`
3. **Database Path**: SQLite at `db/custom.db` (auto-created on first run)
4. **Prisma Client**: Singleton pattern in `src/lib/db.ts`
5. **Response Format**: APIs return `{ success, stores/store, error? }`
6. **Deduplication**: Stores are deduplicated by phone number

## Documentation

Additional documentation exists:
- `SYSTEM_SUMMARY.md` - Complete feature documentation
- `OLLAMA_GUIDE.md` - Ollama setup and troubleshooting
- `OLLAMA_QUICK_START.md` - Quick reference
- `ENHANCED_SYSTEM.md` - System optimization details
