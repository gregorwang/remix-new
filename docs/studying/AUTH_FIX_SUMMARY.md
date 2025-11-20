# Better Auth Fix Summary

## Problem Identified

The authentication system was returning 500 Internal Server Error for both:
1. Magic Link sign-in (`POST /api/auth/sign-in/magic-link`)
2. Google OAuth sign-in (`POST /api/auth/sign-in/social`)

### Root Cause

The error was: `TypeError: db2.insertInto is not a function`

This occurred because Better Auth was configured with:
```typescript
database: {
  provider: "sqlite",
  db: authDb as any,  // ❌ authDb is a Kysely instance
}
```

Better Auth's SQLite adapter expected a raw `better-sqlite3` Database instance but received a Kysely instance, causing method calls like `insertInto()` to fail.

## Solution Implemented

### Changed `app/lib/auth.server.ts`

**Before:**
```typescript
import { authDb } from "./db.server";

export const auth = betterAuth({
  database: {
    provider: "sqlite",
    db: authDb as any,
  },
  // ...
});
```

**After:**
```typescript
import { db } from "./db.server";

export const auth = betterAuth({
  database: db,  // ✅ Raw better-sqlite3 instance
  // ...
});
```

This change:
- Imports the raw `better-sqlite3` Database instance instead of the Kysely wrapper
- Passes it directly to `betterAuth()` without the provider wrapper
- Allows Better Auth to use the native SQLite methods it expects

## How the Database is Structured

In `app/lib/db.server.ts`:

```typescript
// Raw better-sqlite3 connection
const sqliteDb = new Database(dbPath);

// Kysely instance for query building (if needed elsewhere)
export const authDb = new Kysely<any>({
  dialect: new SqliteDialect({
    database: sqliteDb,
  }),
});

// Raw database for Better Auth and existing queries
export const db = sqliteDb;
```

## Environment Variables Required

Create or update your `.env` file with:

```bash
# Required for both auth methods
APP_URL=http://localhost:3000

# Required for Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Required for Magic Link (optional in dev mode)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Optional
ADMIN_EMAILS=admin@example.com
```

## Testing Instructions

### 1. Restart Development Server

```bash
npm run dev
```

### 2. Test Magic Link Authentication

1. Navigate to `http://localhost:3000/auth`
2. Enter your email address
3. Click "发送登录链接"
4. **In development mode** (without RESEND_API_KEY):
   - Check the console for a log like:
   ```
   [Auth] Sending magic link to user@example.com
   ╔═══════════════════════════════════════════════════════════════════╗
   ║                     🔐 MAGIC LINK (开发模式)                      ║
   ╠═══════════════════════════════════════════════════════════════════╣
   ║  收件人: user@example.com                                         ║
   ║  登录链接:                                                        ║
   ║  http://localhost:3000/api/auth/callback/magic-link?token=...   ║
   ...
   ```
   - Copy the link and paste it in your browser
5. **In production mode** (with RESEND_API_KEY):
   - Check your email inbox for the magic link
   - Click the link to sign in

### 3. Test Google OAuth Authentication

1. Navigate to `http://localhost:3000/auth`
2. Click the "使用 Google 登录" button
3. You should be redirected to Google's OAuth consent screen
4. After authorizing, you should be redirected back and logged in

**Note**: Ensure you've added `http://localhost:3000/api/auth/callback/google` to your Google OAuth redirect URIs.

## Expected Behavior

### Before Fix
- ✗ Magic Link: 500 Internal Server Error
- ✗ Google OAuth: 500 Internal Server Error
- ✗ Console: `TypeError: db2.insertInto is not a function`

### After Fix
- ✓ Magic Link: 200 OK, email sent or link printed to console
- ✓ Google OAuth: 302 Redirect to Google OAuth flow
- ✓ Console: `[Auth] Sending magic link to...` and `[Database] Tables initialized successfully`
- ✓ User can successfully authenticate

## Additional Resources

- See `ENV_SETUP_GUIDE.md` for detailed environment variable setup
- Better Auth SQLite documentation: https://www.better-auth.com/docs/adapters/sqlite
- Google OAuth setup: https://console.cloud.google.com/apis/credentials
- Resend API keys: https://resend.com/api-keys

## Files Modified

1. `app/lib/auth.server.ts` - Fixed database configuration
2. `ENV_SETUP_GUIDE.md` - Created comprehensive setup guide
3. `AUTH_FIX_SUMMARY.md` - This file

## Technical Details

The fix aligns with Better Auth's recommended SQLite configuration pattern:

```typescript
import { betterAuth } from "better-auth";
import Database from "better-sqlite3";

export const auth = betterAuth({
  database: new Database("database.sqlite"),
});
```

Our implementation maintains backward compatibility with existing code that uses the raw SQLite database while providing Better Auth with the native instance it requires.

