# Testing: Sejong AI OS Frontend

## Quick Start

```bash
cd client
npm install
npm run build && npx vite preview --port 4173
# Open http://localhost:4173/
```

**Do NOT use `npm run dev` for Supabase integration testing** — see Known Issues below.

## Environment Setup

### Local Supabase Connection
Create `client/.env.local` with:
```
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

For production builds, these are in `client/.env.production` (committed to repo — anon key is public/RLS-protected).

### Vercel Preview Deployments
Vercel preview deployments may require Vercel SSO login. If you can't access the preview URL, use local production build instead:
```bash
cd client && npm run build && npx vite preview --port 4173
```
This is functionally equivalent — same `.env.production`, same build pipeline.

## Key Pages

| Page | URL | What to Test |
|------|-----|-------------|
| Dashboard | `/` | Data source indicator, stats counts |
| HMN Approve | `/approve` | Supabase badge, record list, approve/reject buttons |

## How to Verify Supabase Connection

1. **Visual indicator:** Look for "Supabase 연결됨" (green) vs "Mock 데이터" (grey/amber)
   - Dashboard: bottom system info section, "데이터 소스" field
   - Approve page: green badge near the tab bar

2. **Data count check:** Real Supabase data will have different counts than mock data
   - Mock always shows 5 records (3 pending, 1 approved, 1 rejected) and 6 AI opinions
   - Real data varies — check against Supabase directly

3. **curl verification:**
```bash
curl -s -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  "$SUPABASE_URL/rest/v1/records?select=record_id,status" | python3 -m json.tool
```

## How to Test Approve Button (RPC)

1. Find a record with `status=WAIT_FOR_SYNC` on the approve page
2. **Pre-check:** curl the Supabase API to confirm status
3. Type a memo in the textarea, click "승인" (green button)
4. **Post-check:** curl again — status should change to `APPROVED`
5. Check `hmn_decisions` table for new row

The curl before/after is the definitive proof that RPC was called (mock path only updates local React state, not the database).

## Known Issues

### React 18 StrictMode Dev-Mode Bug
- **Symptom:** `npm run dev` shows "Supabase 연결됨" indicator but data never loads (infinite "데이터 로딩 중..." spinner)
- **Root cause:** `useRecords.ts` useEffect uses `initialized.current` ref. StrictMode runs effects twice: first mount sets ref to true + starts fetch, cleanup cancels fetch, second mount sees ref=true and skips.
- **Workaround:** Use production build (`npm run build && npx vite preview`) for Supabase integration testing
- **Scope:** Dev mode only. Production builds are unaffected.

### Vercel Preview Auth
- Vercel preview deployments might be behind SSO protection
- Use local production build as equivalent alternative

## Devin Secrets Needed

- `SUPABASE_ANON_KEY` — For curl verification of DB state (also in `.env.production`)
- `SUPABASE_SERVICE_ROLE_KEY` — For inserting test data or admin operations
- Vercel token (optional) — For API-based env var management

## Tech Stack
- Vite + React 19 + TypeScript + TailwindCSS v4
- React Router v7
- @supabase/supabase-js
- Deployed on Vercel
