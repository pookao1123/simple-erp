# E2E Testing — Browser-based flows via Playwright

**Status:** Scaffold — awaitingSupabase test project + real credentials

**Tool:** Playwright (chromium) + MSW (mock Service Worker) for API mocking

## What to E2E test

| Flow | Description |
|------|-------------|
| Login → Dashboard | Authenticated user lands on dashboard with KPI cards |
| Signup → Email OTP → Login | New user signs up, receives OTP, logs in |
| Customer CRUD | Create → list → edit → delete customer |
| Product CRUD | Create → list → edit → delete product |
| Invoice create + send | Draft invoice with line items → send → status=sent |
| Invoice mark-paid | Sent invoice → mark paid → status=paid |
| Settings page | Admin-only settings page loads |

## Setup (future)

1. Create a dedicated Supabase test project (separate from production)
2. Set env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Install Playwright: `npx playwright install chromium`
4. Use MSW to mock API responses when running against a real backend is impractical

## Current state

Scaffold written only — no actual Playwright tests yet. E2E testing requires a live backend with real credentials, which is not available in the local dev environment (service_role key not available locally).

**Deferred to Phase 8/9** — E2E tests will be added when a Supabase test project is provisioned.
