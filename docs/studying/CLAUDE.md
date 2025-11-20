# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Remix-based web application featuring secure media access control, multi-page portfolio (photography, music, anime, games), messaging system, and AI chat. Recently migrated from Supabase to Better Auth + Redis + SQLite architecture.

**Tech Stack:**
- **Framework:** Remix v2 with Vite (preparing for React Router v7)
- **Authentication:** Better Auth with Magic Link & Google OAuth
- **Database:** SQLite (better-sqlite3) with Kysely query builder
- **Caching:** Redis (ioredis) for rate limiting and message queues
- **Styling:** Tailwind CSS v4 with framer-motion animations
- **Email:** Resend API for magic link emails

## Development Commands

```bash
# Development
npm run dev              # Start dev server on port 3000

# Build & Deploy
npm run build            # Production build
npm run start            # Start production server
npm run typecheck        # TypeScript type checking
npm run lint             # ESLint check
```

## Architecture & Key Patterns

### Authentication System (Better Auth Migration)

**Critical:** The app recently migrated from Supabase to Better Auth. See `AUTH_FIX_SUMMARY.md` for migration details.

**Database Configuration (`app/lib/db.server.ts`):**
- Exports TWO database instances:
  - `db` - Raw better-sqlite3 instance (for Better Auth and existing queries)
  - `authDb` - Kysely wrapped instance (not currently used by Better Auth)
- Better Auth requires the raw SQLite instance, NOT Kysely wrapper
- Schema includes: `user`, `session`, `account`, `verification`, `messages` tables

**Auth Setup (`app/lib/auth.server.ts`):**
```typescript
import { db } from "./db.server"; // Raw instance!
export const auth = betterAuth({
  database: db,  // ✅ NOT authDb
  // ...
});
```

**Helper Functions:**
- `requireAuth(request)` - Throws 401 if not logged in
- `requireAdmin(request)` - Throws 403 if not admin
- `isAdmin(email)` - Checks ADMIN_EMAILS env var

**Routes:**
- `/auth` - Login page (magic link + Google OAuth)
- `/auth/sign-out` - Sign out action
- Better Auth API routes handled at `/api/auth/*` (auto-generated)

### Messaging System (SQLite + Redis Hybrid)

**Data Storage:** Messages are stored in SQLite's `messages` table (not Redis, despite redis.server.ts having MessageService)

**Flow:**
1. User submits message via `/messages` route action
2. Stored in SQLite with `status='pending'`
3. Admin reviews at `/admin/messages`
4. Approved messages shown on `/messages` loader

**Rate Limiting (Redis):**
- IP-based: 20 requests/hour
- User-based: Check `RateLimitService` in redis.server.ts

### Media Token System (HMAC-based Security)

**Purpose:** Secure access to images/videos on external CDN/OSS with time-limited tokens

**Architecture Evolution (Important):**
- **Old Way (deprecated):** Client-side token fetching via `useImageToken` hook → 36+ API calls
- **New Way (recommended):** Server-side batch token generation in route loaders → 1 request

**Token Generation:**
- Algorithm: HMAC-SHA256 signature with Base64URL encoding
- Format: `base64url("${expires}:${hmac_sha256(imageName:expires)}")`
- Bound to: specific media filename + expiration time

**API Endpoints:**
- `POST /api/image-token` - Generate token for single media file
- `GET /api/verify-token` - Validate token (query params: token, imageName)

**Recommended Pattern (see `rule.md`):**
```typescript
// In loader
import { generateImageTokens } from "~/utils/imageToken.server";

export async function loader() {
  const allImagePaths = [...];
  const tokenResults = generateImageTokens(allImagePaths, 30); // 30 min
  const tokenMap = new Map(
    tokenResults.map(r => [r.imageName, r.imageUrl])
  );

  // Replace all src with tokenized URLs
  return json({ images: photos.map(p => ({
    ...p,
    src: tokenMap.get(p.src)
  }))});
}
```

**Cache Strategy:**
- Tokens valid 5-60 minutes (configurable)
- HTTP cache headers should NOT exceed token validity
- Client-side caching via sessionStorage in hooks (legacy pattern)

### Remix Best Practices (Enforced)

**Critical Rules (from `rule.md`):**
1. **Load data in loaders, not components** - No client-side fetch in useEffect
2. **Use progressive enhancement** - Forms work without JavaScript
3. **Future flags enabled** - All v3_* flags active for React Router v7 migration
4. **Server/client code separation** - Use `.server.ts` and `.client.tsx` suffixes

**Route Structure:**
- Nested routes: `/photo` parent with `/photo/street`, `/photo/landscape`, etc.
- Loaders for data fetching
- Actions for mutations
- ErrorBoundary in each route
- `links()` for resource preloading
- `meta()` for SEO

**Performance Requirements:**
- Set Cache-Control headers on all loaders
- Use `loading="lazy"` for images below fold
- Use `loading="eager"` for hero images
- Implement route prefetching with `<Link prefetch="intent">`

### Component Patterns

**Client-Only Components:**
- Suffix: `.client.tsx` (e.g., `GamePageClient.client.tsx`)
- Use when: Component requires browser APIs, framer-motion animations, or heavy interactivity
- Import: Wrap with `<ClientOnly>` component or use lazy loading

**Server-Optimized Components:**
- Default for all new components
- Minimize state, maximize props from loader

**Styling:**
- Tailwind CSS v4 with custom config
- Use `clsx` or `tailwind-merge` for conditional classes
- Dark mode: Applied via `theme` cookie (see `root.tsx`)

### File Naming Conventions

- **Routes:** `app/routes/some-route.tsx`
- **Server utilities:** `app/lib/utils/*.server.ts`
- **Client hooks:** `app/hooks/useSomething.client.tsx`
- **Shared types:** `app/lib/types.ts` or `app/lib/types/*.ts`

### Environment Variables

**Required:**
```bash
# Authentication
APP_URL=http://localhost:3000
AUTH_KEY_SECRET=your-secret-key      # For media token HMAC

# OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Magic Link (Optional in dev)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@example.com

# Admin Access
ADMIN_EMAILS=admin@example.com,other@example.com

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Media Server
IMAGE_BASE_URL=https://oss.wangjiajun.asia
```

**Setup:** See `ENV_SETUP_GUIDE.md` for detailed configuration

## Common Development Patterns

### Adding a New Authenticated Route

```typescript
// app/routes/new-route.tsx
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireAuth(request);
  // ... fetch data
  return json({ user, data });
}
```

### Adding Admin-Only Features

```typescript
import { requireAdmin } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const admin = await requireAdmin(request); // Throws 403 if not admin
  // ...
}
```

### Database Queries

```typescript
import { db } from "~/lib/db.server";

// Read
const users = db.prepare("SELECT * FROM user WHERE email = ?").all(email);

// Write
db.prepare("INSERT INTO messages (user_id, content) VALUES (?, ?)")
  .run(userId, content);
```

### Using Redis Cache

```typescript
import { redis, RateLimitService } from "~/lib/redis.server";

// Rate limiting
const allowed = await RateLimitService.checkIPRateLimit(clientIP);
if (!allowed) throw new Response("Rate limit exceeded", { status: 429 });

// Custom caching
await redis.set(`key:${id}`, JSON.stringify(data), "EX", 3600);
const cached = await redis.get(`key:${id}`);
```

## Migration Context

**Recent Changes (2025-11):**
- Migrated from Supabase → Better Auth + SQLite
- Removed `app/hooks/useSupabase.ts` and `app/utils/supabase.server.ts`
- Added `app/lib/auth.server.ts` and `app/lib/db.server.ts`
- Messages now stored in SQLite, not Redis (despite redis.server.ts code)
- Token generation should prefer server-side loaders over client hooks

**Breaking Changes:**
- Authentication API completely different (see Better Auth docs)
- Session management now via Better Auth session tokens
- Database schema changed (see `COMPLETE_SCHEMA_FIX.md`)

## Important Files Reference

**Authentication:**
- `app/lib/auth.server.ts` - Better Auth config & helpers
- `app/lib/db.server.ts` - SQLite + Kysely setup
- `app/routes/auth.tsx` - Login page

**Core Utilities:**
- `app/lib/email.server.ts` - Magic link email sender
- `app/lib/redis.server.ts` - Redis client & rate limiting
- `app/lib/utils/cryptoUtils.ts` - Token generation helpers

**Configuration:**
- `vite.config.ts` - Build config with code splitting
- `.env` - Environment variables (create from `.env.example`)

**Documentation:**
- `rule.md` - Comprehensive Remix best practices guide
- `AUTH_FIX_SUMMARY.md` - Better Auth migration details
- `ENV_SETUP_GUIDE.md` - Environment setup instructions

## Testing Checklist

When making changes:
- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] Code passes linting (`npm run lint`)
- [ ] Production build succeeds (`npm run build`)
- [ ] Authentication flows work (magic link + OAuth)
- [ ] Admin routes require proper permissions
- [ ] Image tokens generate correctly
- [ ] Rate limiting functions properly
- [ ] No client-side data fetching in components (use loaders)
