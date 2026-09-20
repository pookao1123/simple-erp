# Simple ERP Web System — Development Plan

**Date:** 2026-09-20  
**Status:** Active planning document

---

## A. Architecture

### Stack Overview
- **Frontend:** React 18 + TypeScript + Tailwind CSS → hosted on Vercel (free tier)
- **Backend:** Node.js + TypeScript → Vercel serverless functions (preferred) OR separate Express service
- **Database + Auth:** Supabase (PostgreSQL + Auth + Realtime + Storage, free tier)
- **Version Control:** GitHub + main + feature branches + PR workflow
- **Package Manager:** npm

### Data Flow & Deployment

```
┌─────────────────────────┐
│   User Browser          │
│   (React frontend)      │
└────────────┬────────────┘
             │ HTTPS REST + WebSocket
             ↓
┌─────────────────────────┐
│   Vercel Edge / Lambda  │
│   (API routes or        │
│    serverless functions)│
└────────────┬────────────┘
             │ HTTPS + pgSQL wire
             ↓
┌─────────────────────────┐
│   Supabase              │
│   ├─ PostgreSQL DB      │
│   ├─ Auth (JWT/JWT key) │
│   ├─ Realtime (sockets) │
│   └─ Storage (files)    │
└─────────────────────────┘
```

### Key Design Decisions

**Frontend on Vercel:**
- Deployment: `vercel deploy` on PR merge to main
- Environment: `.env.local` (dev), `.env.production` (prod)
- API client: fetch/axios → Vercel serverless endpoints
- State: React Context or lightweight Redux for auth + UI state
- No separate backend needed if serverless functions suffice

**Backend as Serverless:**
- Each API endpoint = one function file in `/api` directory
- Database queries via Supabase JS client
- No long-running processes; stateless per-request
- If complex workflows needed (queues, background jobs), migrate to separate Express service later

**Database (Supabase PostgreSQL):**
- Managed PostgreSQL instance
- Migrations via `supabase db push` (local-first) or SQL scripts
- Row-Level Security (RLS) for multi-tenant isolation (if needed)
- Realtime subscriptions for live updates

**Auth (Supabase Auth):**
- Handles JWT generation, password hashing, email verification, password reset
- Session stored in localStorage (frontend) + JWT in Authorization header
- Role-based access control (RBAC) stored in custom `user_roles` table (backend enforces)
- No separate auth service needed

### Git Strategy

**Branching:**
- `main` → production-ready, deployable at any commit
- `develop` → integration branch (optional, if team prefers)
- Feature branches: `feature/invoice-module`, `fix/auth-bug`, `refactor/db-indexes`
- Protection: main requires PR review + all CI checks pass

**PR Workflow:**
1. Create feature branch from main
2. Push commits regularly
3. Open PR with description (what, why, testing done)
4. CI/CD runs (lint, type check, tests)
5. Code review (cross-sub-agent if needed)
6. Merge → auto-deploy to Vercel (preview on PR, prod on main merge)

**Release Process:**
- Tag commits on main: `v1.0.0`, `v1.0.1` (semantic versioning)
- Release notes in GitHub Releases (auto-generated from commits)
- Supabase migrations tagged alongside releases

---

## B. Sub-Agent Assignments

| Agent | Owns | Model | Scope | Boundary |
|-------|------|-------|-------|----------|
| **claude-frontend** | React components, pages, routing, state (Context/Redux), Tailwind, responsive design, form handling | Haiku | UI/UX implementation, component library | Does NOT: API design, database schema, auth tokens (uses auth context from security agent) |
| **claude-backend** | Serverless function logic, business rules, workflows, transaction handling, error handling, logging | Sonnet | Request → response processing, calculations, validations (after API layer) | Does NOT: API contract (api agent), schema design (db agent), deployment (operating agent) |
| **claude-api** | Endpoint design, request/response schemas, versioning, error codes, documentation | Haiku | API contracts, specifications, deprecation | Does NOT: Implement endpoints (backend), design DB schema (database agent) |
| **claude-database** | Schema design, migrations, indexes, relationships, views, query optimization, data integrity | Sonnet | DB structure, migrations, query patterns, Supabase-specific features (RLS, Realtime) | Does NOT: Implement application business logic (backend) |
| **claude-security** | Auth strategy, RBAC design, input validation, SQL injection prevention, secrets management, RLS policies, OWASP alignment | Sonnet | Security architecture & guardrails, before implementation | Does NOT: Implement code (handed to implementing agents for integration) |
| **claude-testing** | Unit/integration/E2E test strategy, test data, fixtures, coverage targets, CI/CD test integration | Haiku | Test design & coverage, test-related tooling, reported to operating for CI setup | Does NOT: Implement features (done by feature agents) |
| **claude-operating** | Deployment, CI/CD (GitHub Actions), environment config, secrets in .env, monitoring, Git workflow, backups | Haiku | Infrastructure as code, deployment automation, runtime operations | Does NOT: Application code, database schema, API design |

| **claude-codereview** | PR reviews, diff reviews, bug/security/style checks, review reports | Haiku | Code review only — reads code, writes findings | Does NOT: Implement code, design schema, write tests |
---

## C. Phases & Steps

### Phase 1: Frontend Simple Web
**Goal:** Get a visible, navigable UI running with dummy data. No backend or database yet.

**Step 1.1** — Project scaffold
- [ ] Create Next.js/React Vite project with TypeScript
- [ ] Set up Tailwind CSS, ESLint, Prettier
- [ ] Initialize Git repo, push to GitHub
- [ ] Deploy empty app to Vercel (blank page)
- **Agent:** claude-frontend, claude-operating
- **Done:** Vercel preview URL live, git repo exists, linting passes

**Step 1.2** — Layout & navigation
- [ ] Main layout (header, sidebar, main content area)
- [ ] React Router setup
- [ ] Navigation bar with links (Dashboard, Invoices, Customers, Products, Settings)
- [ ] Responsive design (mobile, tablet, desktop)
- **Agent:** claude-frontend
- **Done:** Navigation works, all routes render placeholder pages, responsive tested on 3 breakpoints

**Step 1.3** — Core pages (Dashboard, Invoices, Customers, Products)
- [ ] Dashboard page: dummy charts, KPIs (revenue, invoice count, customer count)
- [ ] Invoices page: table with dummy invoice data (columns: ID, customer, amount, date, status)
- [ ] Customers page: table with dummy customer data (columns: ID, name, email, phone, created date)
- [ ] Products page: table with dummy product data (columns: ID, name, price, category, stock)
- [ ] No interactions yet; display only
- **Agent:** claude-frontend
- **Done:** All pages render, responsive, dummy data visible

**Step 1.4** — Theme & component library
- [ ] Tailwind theme configuration (colors, spacing, typography)
- [ ] Reusable components: Button, Input, Modal, Table, Card, Badge
- [ ] Apply components consistently across pages
- [ ] Dark mode toggle (localStorage-based, no backend)
- **Agent:** claude-frontend
- **Done:** Theme applies globally, dark mode toggles, component storybook (optional) exists

**Phase 1 Done Gate:** 
- Frontend deployed to Vercel
- All pages render with dummy data
- Navigation works
- Responsive design confirmed
- CI/CD pipeline runs (lint, build passes)

---

### Phase 2: Authentication & Authorization
**Goal:** User login/signup, JWT-based sessions, role-based access control.

**Step 2.1** — Supabase project setup
- [ ] Create Supabase project (free tier)
- [ ] Postgres DB instance initialized
- [ ] Enable Auth (email/password)
- [ ] Create `user_roles` table (user_id, role enum: admin, manager, employee, customer)
- [ ] Create `users` view (joins auth.users + user_roles)
- [ ] Environment variables (.env.local, .env.production) with Supabase keys
- **Agent:** claude-database, claude-security, claude-operating
- **Done:** Supabase project live, tables exist, keys in env

**Step 2.2** — Auth context & login flow
- [ ] React Context for auth state (current user, login, logout, signup)
- [ ] Login page (email, password, submit button)
- [ ] Signup page (email, password, name, submit button)
- [ ] Protected route wrapper (redirects to login if not authenticated)
- [ ] Supabase JS client integration (signUp, signIn, signOut)
- [ ] Store JWT in localStorage, send in Authorization header for API calls
- **Agent:** claude-frontend, claude-security
- **Done:** Login/signup forms functional, JWT stored, protected routes work

**Step 2.3** — RBAC enforcement
- [ ] Fetch user role on login (from `user_roles` table)
- [ ] Store role in auth context
- [ ] Frontend role guards: show/hide UI elements based on role
- [ ] Page-level role checks (e.g., Settings page only for admin)
- [ ] Backend middleware to validate JWT + role (on API calls)
- **Agent:** claude-security, claude-backend (middleware), claude-frontend
- **Done:** Role-based UI elements visible/hidden correctly, API middleware rejects unauthorized requests

**Step 2.4** — Password reset & email verification
- [ ] Email verification on signup (Supabase native)
- [ ] Forgot password page → email reset link
- [ ] Supabase native password reset flow
- **Agent:** claude-frontend, claude-security
- **Done:** Email verification works, password reset email sent, link resets password

**Phase 2 Done Gate:**
- Signup/login/logout fully functional
- User roles fetched and displayed
- Protected routes enforce authentication
- API calls include JWT
- Backend middleware validates auth
- Email verification working
- Password reset working

---

### Phase 3: Database Schema & Core Entities
**Goal:** Full relational schema for invoices, customers, products, line items. No business logic yet; schema + basic CRUD queries.

**Step 3.1** — Create core tables
- [ ] `customers` (id, user_id, name, email, phone, address, tax_id, payment_terms, created_at, updated_at)
- [ ] `products` (id, user_id, name, description, price, cost, category, tax_rate, active, created_at, updated_at)
- [ ] `invoices` (id, user_id, customer_id, invoice_no, date, due_date, subtotal, tax, total, notes, status [draft, sent, paid, overdue], created_at, updated_at)
- [ ] `line_items` (id, invoice_id, product_id, description, qty, unit_price, tax_rate, amount, created_at)
- [ ] Foreign keys + indexes
- **Agent:** claude-database, claude-security (RLS policies)
- **Done:** Schema deployed, migrations tracked in git, RLS policies in place

**Step 3.2** — Indexes & optimization
- [ ] Index on (user_id, created_at) for listing queries
- [ ] Index on (customer_id) for lookups
- [ ] Index on (invoice_no, user_id) for uniqueness
- [ ] Query performance testing (simple EXPLAIN ANALYZE)
- **Agent:** claude-database
- **Done:** Indexes deployed, basic queries run under 50ms

**Step 3.3** — Row-level security (RLS)
- [ ] Enable RLS on all tables
- [ ] Policy: users can only see/edit their own data (user_id = auth.uid())
- [ ] Policy: admin can see all data
- [ ] Test: logged-in user cannot query other user's invoices
- **Agent:** claude-database, claude-security
- **Done:** RLS policies enforced, cross-user leakage prevented

**Step 3.4** — Seed data
- [ ] Seed script (SQL or TypeScript) for test data
- [ ] 5 test customers, 10 test products, 20 test invoices per user
- [ ] Run seed in dev environment
- **Agent:** claude-database
- **Done:** Seed script exists, can be run on fresh database

**Phase 3 Done Gate:**
- All tables created & migrated to main
- RLS policies active
- Seed data can populate test DB
- Indexes deployed
- Query performance acceptable

---

### Phase 4: API Layer — Endpoints & Validation
**Goal:** Full REST API design; validation & error codes; request/response contracts.

**Step 4.1** — API specification (OpenAPI/Swagger)
- [ ] Endpoint groups: Auth, Customers, Products, Invoices, LineItems
- [ ] Each endpoint: method, path, request body/params, response schema, error codes
- [ ] Document in OPENAPI.md or Swagger file
- [ ] Example requests/responses
- **Agent:** claude-api
- **Done:** API spec document complete, shared with team

**Step 4.2** — Validate schema design
- [ ] Review with claude-backend, claude-database (feasibility)
- [ ] Adjust for Supabase capabilities (no complex transactions yet)
- **Agent:** claude-api, claude-backend, claude-database
- **Done:** Sign-off on design

**Step 4.3** — Error handling & codes
- [ ] Standard error response format: `{ error: { code, message, details } }`
- [ ] HTTP status codes: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- [ ] Validation errors: list field + error message per field
- **Agent:** claude-api, claude-backend
- **Done:** Error format documented, examples provided

**Step 4.4** — Input validation strategy
- [ ] Frontend: client-side validation (quick feedback)
- [ ] Backend: server-side validation (security, contract enforcement)
- [ ] Use Zod or Joi for schema validation
- [ ] Validate types, ranges, required fields, email format, etc.
- **Agent:** claude-security, claude-backend
- **Done:** Validation rules defined, test cases written

**Phase 4 Done Gate:**
- API spec complete & reviewed
- Error handling designed
- Validation strategy approved
- Ready for implementation (Phase 5)

---

### Phase 5: Backend Implementation — Serverless Functions
**Goal:** Implement all API endpoints. Each endpoint = one serverless function file.

**Step 5.1** — Auth endpoints
- [ ] `POST /api/auth/signup` (email, password, name)
- [ ] `POST /api/auth/login` (email, password)
- [ ] `POST /api/auth/logout`
- [ ] `POST /api/auth/refresh-token`
- [ ] `GET /api/auth/me` (current user + role)
- **Agent:** claude-backend, claude-security
- **Done:** All endpoints callable, JWT returned, refresh works

**Step 5.2** — Customers endpoints
- [ ] `GET /api/customers` (list, paginated, filter by name)
- [ ] `POST /api/customers` (create, validate email uniqueness)
- [ ] `GET /api/customers/:id` (get single)
- [ ] `PUT /api/customers/:id` (update)
- [ ] `DELETE /api/customers/:id` (soft delete or hard delete)
- **Agent:** claude-backend
- **Done:** All CRUD operations work, RLS enforced, pagination tested

**Step 5.3** — Products endpoints
- [ ] `GET /api/products` (list, paginated)
- [ ] `POST /api/products` (create)
- [ ] `GET /api/products/:id` (get single)
- [ ] `PUT /api/products/:id` (update)
- [ ] `DELETE /api/products/:id` (soft delete)
- **Agent:** claude-backend
- **Done:** All CRUD operations work, validation working

**Step 5.4** — Invoices endpoints
- [ ] `GET /api/invoices` (list, filter by status, date range)
- [ ] `POST /api/invoices` (create draft invoice)
- [ ] `GET /api/invoices/:id` (get with line items)
- [ ] `PUT /api/invoices/:id` (update)
- [ ] `POST /api/invoices/:id/send` (change status to sent, send email)
- [ ] `POST /api/invoices/:id/mark-paid` (change status to paid)
- [ ] `DELETE /api/invoices/:id` (delete draft only)
- **Agent:** claude-backend
- **Done:** Invoice lifecycle working, status transitions enforced

**Step 5.5** — Line Items endpoints (nested under invoices)
- [ ] `POST /api/invoices/:id/line-items` (add line to invoice)
- [ ] `PUT /api/invoices/:id/line-items/:lineId` (update)
- [ ] `DELETE /api/invoices/:id/line-items/:lineId` (remove line)
- [ ] Auto-recalculate invoice totals on line item change
- **Agent:** claude-backend
- **Done:** Line items CRUD working, totals auto-calculated

**Step 5.6** — Error handling & logging
- [ ] Wrap endpoints in try-catch, return standard error format
- [ ] Log errors (console or Supabase logs)
- [ ] Test error scenarios (duplicate keys, invalid IDs, permission denied)
- **Agent:** claude-backend
- **Done:** Error handling consistent, logging working

**Phase 5 Done Gate:**
- All endpoints implemented
- Authorization (JWT + role) enforced on each
- Database queries tested
- Error handling working
- Manual API testing passed (Postman or curl)

---

### Phase 6: Frontend Integration — Connect UI to API
**Goal:** Replace dummy data with real API calls. Full CRUD for all entities.

**Step 6.1** — API client setup
- [ ] Create API client module (fetchUser, fetchCustomers, createCustomer, etc.)
- [ ] Centralized error handling (catch 401 → redirect to login)
- [ ] Bearer token injection in headers
- [ ] Handle network errors gracefully
- **Agent:** claude-frontend
- **Done:** API client module working, tested with mock server

**Step 6.2** — Customers page full implementation
- [ ] Fetch customers on page load
- [ ] Table shows real data
- [ ] Add customer button → modal form
- [ ] Create customer via API
- [ ] Edit customer → modal, update via API
- [ ] Delete customer → confirm, delete via API
- [ ] Loading states, error messages
- **Agent:** claude-frontend
- **Done:** Full CRUD on page, all interactions tested

**Step 6.3** — Products page full implementation
- [ ] Fetch products on page load
- [ ] Table shows real data
- [ ] Add product button → modal form
- [ ] Create product via API
- [ ] Edit product → modal, update via API
- [ ] Delete product → confirm, delete via API
- [ ] Loading states, error messages
- **Agent:** claude-frontend
- **Done:** Full CRUD on page, all interactions tested

**Step 6.4** — Invoices page full implementation
- [ ] Fetch invoices on page load
- [ ] Table shows real data (ID, customer, amount, date, status)
- [ ] Filter by status, date range
- [ ] Pagination
- [ ] Create invoice → modal, select customer + products, add line items
- [ ] View invoice → detail page with all line items, totals
- [ ] Edit invoice (draft only) → modify lines, recalculate
- [ ] Send invoice → change status, email (backend handles)
- [ ] Mark paid → change status
- [ ] Delete invoice (draft only)
- [ ] Loading states, error messages
- **Agent:** claude-frontend
- **Done:** Full invoice workflow tested

**Step 6.5** — Dashboard integration
- [ ] Fetch KPIs from backend: total revenue, invoice count, customer count, overdue invoices
- [ ] Fetch chart data: invoices by month, revenue by customer
- [ ] Update charts with real data
- [ ] Real-time updates (optional: Supabase Realtime subscriptions)
- **Agent:** claude-frontend
- **Done:** Dashboard shows real data, charts update

**Step 6.6** — Settings page
- [ ] User profile: edit name, email, company name
- [ ] Change password
- [ ] Manage team members (admin only)
- [ ] Logout button
- **Agent:** claude-frontend
- **Done:** Settings functional

**Phase 6 Done Gate:**
- All pages connected to backend
- Full CRUD workflows tested end-to-end
- Loading & error states working
- Manual testing passed
- No dummy data remaining

---

### Phase 7: Testing — Unit, Integration, E2E
**Goal:** Comprehensive test coverage. Security & regression testing.

**Step 7.1** — Unit tests (backend)
- [ ] Validation functions (email format, invoice totals, etc.)
- [ ] Business logic (invoice status transitions, discount calculations)
- [ ] Target: >80% coverage on critical paths
- **Agent:** claude-testing, claude-backend
- **Done:** Unit tests run, CI passes

**Step 7.2** — Integration tests (backend + database)
- [ ] Test CRUD operations with real Supabase (test database)
- [ ] Test RLS policies (user isolation)
- [ ] Test cascading deletes (delete customer → delete invoices)
- [ ] Test transactions (invoice creation + line items)
- **Agent:** claude-testing, claude-database
- **Done:** Integration tests pass, no data leaks

**Step 7.3** — E2E tests (frontend + backend + database)
- [ ] Signup → login → create customer → create product → create invoice → send invoice
- [ ] Role-based access (customer cannot access admin settings)
- [ ] Error scenarios (duplicate customer, invalid invoice, network error)
- [ ] Use Cypress or Playwright
- **Agent:** claude-testing, claude-frontend, claude-backend
- **Done:** E2E tests pass, critical flows covered

**Step 7.4** — Security tests
- [ ] Attempt to access other user's data via API (should fail)
- [ ] SQL injection attempts (should be sanitized)
- [ ] CSRF (if applicable)
- [ ] XSS on user-generated fields (should be escaped)
- [ ] Password reset token expiry (should not work after expiry)
- **Agent:** claude-security, claude-testing
- **Done:** All security tests pass

**Step 7.5** — Performance tests
- [ ] Load-test invoice listing with 10k invoices (should return in <1s)
- [ ] Concurrent user signup (10 users simultaneously)
- [ ] API response times documented
- **Agent:** claude-testing
- **Done:** Performance acceptable, no timeouts

**Phase 7 Done Gate:**
- Test coverage >80% on backend
- All E2E flows pass
- Security tests pass
- CI/CD pipeline runs tests on every PR
- No regressions

---

### Phase 8: Deployment & Operations
**Goal:** Production setup, CI/CD, monitoring, backups.

**Step 8.1** — Environment management
- [ ] `.env.production` in Vercel (Supabase prod keys, etc.)
- [ ] Secrets in GitHub (no leaks in git)
- [ ] Production database separate from dev
- [ ] Read-only backups enabled in Supabase
- **Agent:** claude-operating
- **Done:** Environments isolated, secrets secure

**Step 8.2** — CI/CD pipeline (GitHub Actions)
- [ ] On PR: lint, type-check, test, build
- [ ] On merge to main: deploy frontend to Vercel, deploy backend functions
- [ ] On merge to main: run E2E tests against production
- [ ] Rollback mechanism (revert commit or deploy previous version)
- **Agent:** claude-operating, claude-testing
- **Done:** CI/CD runs successfully, deployments automated

**Step 8.3** — Monitoring & logging
- [ ] Error tracking (Sentry or Supabase logs)
- [ ] Performance monitoring (Vercel Analytics)
- [ ] Database query logging (Supabase)
- [ ] Alert on errors (email or Slack)
- **Agent:** claude-operating
- **Done:** Monitoring dashboard live, alerts working

**Step 8.4** — Backups & disaster recovery
- [ ] Database backups (daily, Supabase managed)
- [ ] Backup test (restore from backup to test DB)
- [ ] RTO/RPO documented (e.g., recover in <1 hour, lose <1 day data)
- **Agent:** claude-operating, claude-database
- **Done:** Backups configured, test restore successful

**Step 8.5** — Documentation
- [ ] API documentation (endpoint list, request/response examples)
- [ ] Deployment guide (how to deploy manually if needed)
- [ ] Database migration guide (how to run migrations)
- [ ] Troubleshooting guide (common errors, solutions)
- **Agent:** claude-operating
- **Done:** Documentation in README.md or docs/ folder

**Phase 8 Done Gate:**
- Production deployment successful
- CI/CD automated
- Monitoring live
- Backups working
- Documentation complete

---

### Phase 9: Optional — Advanced Features (Post-MVP)
**Goal:** Once MVP is stable, add advanced features.

**Candidate features:**
- **Recurring invoices:** Auto-generate invoices on schedule
- **Payments:** Integrate Stripe for payment collection
- **Expenses:** Track business expenses
- **Reports:** Custom reports (tax summary, profit & loss)
- **Audit logs:** Track changes to invoices, customers
- **Multi-currency:** Support multiple currencies
- **Integrations:** Zapier, Slack, QuickBooks sync
- **Mobile app:** React Native or PWA

**Phase 9 Decision Gate:**
- MVP stable for 2+ weeks
- User feedback collected
- Feature prioritization done
- Pick 1-2 features for Phase 9

---

## D. API Contract Sketch

### Endpoint Groups

#### Authentication
```
POST   /api/auth/signup              → { email, password, name } → { user, token }
POST   /api/auth/login               → { email, password } → { user, token }
POST   /api/auth/logout              → {} → {}
POST   /api/auth/refresh-token       → {} → { token }
GET    /api/auth/me                  → {} → { user, role }
POST   /api/auth/forgot-password     → { email } → {}
POST   /api/auth/reset-password      → { token, password } → {}
```

#### Customers
```
GET    /api/customers                → { page, limit, search } → { data: [], total, page }
POST   /api/customers                → { name, email, phone, ... } → { id, name, email, ... }
GET    /api/customers/:id            → {} → { id, name, email, ... }
PUT    /api/customers/:id            → { name, email, phone, ... } → { id, name, email, ... }
DELETE /api/customers/:id            → {} → {}
```

#### Products
```
GET    /api/products                 → { page, limit, search } → { data: [], total, page }
POST   /api/products                 → { name, price, cost, category, ... } → { id, name, ... }
GET    /api/products/:id             → {} → { id, name, price, ... }
PUT    /api/products/:id             → { name, price, cost, category, ... } → { id, ... }
DELETE /api/products/:id             → {} → {}
```

#### Invoices
```
GET    /api/invoices                 → { page, limit, status, from, to } → { data: [], total, page }
POST   /api/invoices                 → { customer_id, notes, ... } → { id, invoice_no, status, ... }
GET    /api/invoices/:id             → {} → { id, customer: {}, line_items: [], totals, ... }
PUT    /api/invoices/:id             → { notes, due_date, ... } → { id, ... }
DELETE /api/invoices/:id             → {} → {}
POST   /api/invoices/:id/send        → {} → { status: "sent", sent_at }
POST   /api/invoices/:id/mark-paid   → {} → { status: "paid", paid_at }
```

#### Line Items (nested under invoices)
```
POST   /api/invoices/:id/line-items      → { product_id, qty, unit_price } → { id, ... }
PUT    /api/invoices/:id/line-items/:lid → { qty, unit_price } → { id, ... }
DELETE /api/invoices/:id/line-items/:lid → {} → {}
```

#### Dashboard
```
GET    /api/dashboard/kpis                → {} → { revenue, invoices_count, customers_count, overdue_count }
GET    /api/dashboard/invoices-by-month   → { months: 6 } → { data: [ { month, amount } ] }
GET    /api/dashboard/revenue-by-customer → { limit: 5 } → { data: [ { customer, amount } ] }
```

---

## E. Database Schema Sketch

### Core Tables (Supabase PostgreSQL)

```sql
-- Users & Roles (Supabase Auth manages auth.users)
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'employee', 'customer')),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Customers
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'NET30',
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(user_id, email)
);

-- Products
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  cost DECIMAL(10, 2),
  category TEXT,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Invoices
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_no TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal DECIMAL(12, 2) DEFAULT 0,
  tax DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE(user_id, invoice_no)
);

-- Line Items
CREATE TABLE line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  qty DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  amount DECIMAL(12, 2) GENERATED ALWAYS AS (qty * unit_price) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_customers_user_id ON customers(user_id, created_at DESC);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id, created_at DESC);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_line_items_invoice_id ON line_items(invoice_id);

-- Row-Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users see only their own data, admin sees all)
-- ... (see Security Checklist for details)
```

### Views & Helpers
```sql
-- User lookup (auth.users + roles)
CREATE VIEW users_with_roles AS
SELECT 
  u.id, 
  u.email, 
  COALESCE(r.role, 'employee') as role
FROM auth.users u
LEFT JOIN user_roles r ON u.id = r.user_id;

-- Invoice totals view
CREATE VIEW invoice_totals AS
SELECT 
  i.id,
  i.user_id,
  i.customer_id,
  SUM(li.amount) as line_items_total,
  COALESCE(i.tax, 0) as tax,
  COALESCE(i.subtotal, 0) as subtotal,
  (COALESCE(i.subtotal, 0) + COALESCE(i.tax, 0)) as total
FROM invoices i
LEFT JOIN line_items li ON i.id = li.invoice_id
GROUP BY i.id;
```

---

## F. Security Checklist

### Authentication (Supabase Auth handles)
- [x] Email/password signup with validation
- [x] Email verification on signup
- [x] Password hashing (bcrypt, Supabase manages)
- [x] JWT token generation & expiry (15 min access, 7 day refresh)
- [x] Password reset flow (email link, token expiry)
- [x] Session management (localStorage + HTTP-only cookies option)

### Authorization & Access Control
- [ ] **RBAC enforced:** User role fetched on login, stored in JWT or auth context
- [ ] **API middleware:** Every endpoint validates JWT + checks user role (if endpoint restricted)
- [ ] **Frontend role guards:** Hide UI elements based on role (admin-only settings)
- [ ] **RLS policies:** Every table has RLS enabled; users can only see/edit their own data (WHERE user_id = auth.uid())
- [ ] **Admin exception:** Admin role can query all data (RLS policy: `role = 'admin' OR user_id = auth.uid()`)
- [ ] **Test:** Log in as user A, attempt to fetch user B's invoices via API → should return 403 Forbidden

### Input Validation & Injection Prevention
- [ ] **Frontend validation:** Client-side checks for required fields, email format, etc. (UX only, not security)
- [ ] **Backend validation:** Every endpoint validates request body against schema (Zod, Joi, or custom)
- [ ] **SQL injection:** Use parameterized queries (Supabase client does this by default)
- [ ] **XSS prevention:** Escape user-generated text before rendering (React does this by default; sanitize if innerHTML used)
- [ ] **CSRF:** If using cookies, implement CSRF token on state-changing requests (low priority on Vercel serverless)
- [ ] **Test:** Try `POST /api/customers` with `name: "<img src=x onerror='alert(1)'>"` → should render as text, not execute

### Data Integrity & Privacy
- [ ] **Encryption at rest:** Supabase PostgreSQL encrypts data at rest (managed)
- [ ] **Encryption in transit:** All API calls over HTTPS (Vercel + Supabase enforce)
- [ ] **PII handling:** Avoid logging passwords, API keys, tokens
- [ ] **Data retention:** Define policy for deleted data (soft delete or hard delete after N days)
- [ ] **Backups:** Daily backups, tested restore (Supabase manages)

### Secrets & Environment Variables
- [ ] **No secrets in git:** .env files in .gitignore
- [ ] **Vercel secrets:** Supabase URL, API key, JWT secret stored in Vercel environment (not in code)
- [ ] **Local dev:** .env.local with development keys (Supabase dev project)
- [ ] **Production:** .env.production with production keys (Supabase prod project)
- [ ] **Rotate keys:** If leaked, rotate immediately (Supabase provides key rotation)

### API Security
- [ ] **Rate limiting:** Prevent brute-force login (limit 5 attempts per minute per IP)
- [ ] **HTTPS only:** All traffic encrypted
- [ ] **CORS:** Frontend domain whitelisted in API (Vercel serverless handles)
- [ ] **API versioning:** Start with v1 (e.g., `/api/v1/invoices`) for future compatibility

### Compliance & Audit
- [ ] **Audit log:** Track changes to invoices (create, update, delete with who/when)
- [ ] **GDPR:** User can download their data, delete their account (Supabase Auth has built-in)
- [ ] **Password policy:** Enforce strong passwords (Supabase can enforce)
- [ ] **2FA (optional):** MFA on login (Supabase supports, not required for MVP)

### Testing & Verification
- [ ] **Security test:** Attempt cross-user data access (should fail)
- [ ] **Injection test:** SQL injection, XSS attempts (should be sanitized)
- [ ] **Replay test:** Reuse expired JWT (should be rejected)
- [ ] **Permission test:** Employee cannot access admin settings (should be denied)

---

## G. Testing Strategy

### Phase 1: Frontend Simple Web
- **Manual testing:** Navigate all pages, responsive design on mobile/tablet/desktop
- **No automated tests required** (visual/navigation only)

### Phase 2: Authentication & Authorization
- **Unit tests:** Validation functions (email format, password strength)
- **Integration tests:** Signup → email verification → login → JWT refresh
- **E2E tests:** Signup flow, login, protected routes redirect to login
- **Security tests:** Expired JWT rejected, unauthorized role blocked from admin page
- **Coverage:** >90% on auth flow

### Phase 3: Database Schema & Entities
- **Integration tests:** CRUD on all tables (customers, products, invoices)
- **RLS tests:** User A cannot see user B's data, admin can see all
- **Cascade tests:** Delete customer → invoices deleted (if configured)
- **Query performance:** Basic queries <50ms, listing 1000 records <200ms
- **Coverage:** >80% on data layer

### Phase 4 & 5: API & Backend
- **Unit tests:** Business logic (invoice status transitions, total calculations)
- **Integration tests:** API endpoints return correct responses, validation works
- **Error handling:** Invalid inputs, missing fields, unauthorized access
- **Pagination:** API returns correct page, limit, total count
- **Coverage:** >80% on backend logic

### Phase 6: Frontend Integration
- **E2E tests (critical paths):**
  - Signup → create customer → create product → create invoice → send invoice → mark paid
  - Role-based access (customer vs. employee vs. admin)
  - Error scenarios (duplicate customer, network error)
- **Manual testing:** UI interactions, loading states, error messages
- **Regression testing:** Existing pages still work after adding new features
- **Coverage:** All customer-facing workflows

### Phase 7: Security & Performance
- **Security tests:** SQL injection, XSS, CSRF, authorization bypass, cross-user access
- **Load tests:** 100 concurrent users, invoice listing with 10k records
- **Benchmark:** API response times documented (e.g., GET /invoices <1s)

### Phase 8: Deployment & Operations
- **Smoke tests:** After deploy, verify core endpoints respond
- **Backup test:** Restore from backup, verify data integrity
- **Monitoring test:** Errors logged, alerts triggered

### Test Tools & Environment
- **Frontend:** Vitest (unit), Cypress (E2E)
- **Backend:** Vitest (unit), Supertest (integration)
- **Database:** Supabase local dev environment (migrations tested)
- **CI/CD:** GitHub Actions runs tests on every PR

### Coverage Targets
- Backend business logic: >80%
- Frontend components: >70%
- API endpoints: >90%
- Critical paths: 100% (E2E coverage)

---

## H. Output Format Per Sub-Agent

### claude-frontend
- **Deliverables:**
  - React components (`.tsx` files in `src/components/`)
  - Pages (`.tsx` files in `src/pages/`)
  - CSS/Tailwind styles (inline or in `.css` files)
  - State management (Context or Redux)
- **Format:**
  - Well-typed components (TypeScript interfaces for props)
  - Exported from index files for easy imports
  - Storybook stories (optional, for component documentation)
  - README (component library usage)
- **Definition of done:**
  - Component renders without errors
  - Responsive design tested (3+ breakpoints)
  - TypeScript strict mode passes
  - Storybook story exists (if component reusable)

### claude-backend
- **Deliverables:**
  - Serverless function files (e.g., `api/customers/list.ts`, `api/customers/create.ts`)
  - Business logic modules (e.g., `lib/invoice-service.ts`)
  - Validation schemas (Zod or Joi)
  - Error handling middleware
- **Format:**
  - TypeScript with strict types
  - Async/await for DB queries
  - Request/response validation
  - Error responses in standard format
- **Definition of done:**
  - Function handles all success + error cases
  - Validated input + output types
  - RLS enforced (queries use auth.uid())
  - Unit + integration tests pass
  - Manual testing with Postman/curl confirms contract

### claude-api
- **Deliverables:**
  - OpenAPI/Swagger specification (YAML or JSON)
  - API documentation (Markdown or HTML)
  - Request/response examples
  - Error code catalog
- **Format:**
  - Endpoint groups clearly defined
  - Request/response schemas for each endpoint
  - Example requests & responses (JSON)
  - Error codes & messages documented
- **Definition of done:**
  - Spec complete & validated against backend implementation
  - Examples can be copy-pasted and work
  - Ready for frontend integration

### claude-database
- **Deliverables:**
  - SQL migration files (`migrations/001_create_tables.sql`, etc.)
  - Schema documentation (ERD or text description)
  - RLS policies (SQL)
  - Seed data script (SQL or TypeScript)
  - Query performance notes
- **Format:**
  - Migrations idempotent (safe to run multiple times)
  - RLS policies clearly commented
  - Indexes documented (why each index exists)
  - Seed script includes test data
- **Definition of done:**
  - Migrations run without errors
  - RLS policies tested (cross-user isolation confirmed)
  - Indexes reduce query time by measurable amount
  - Seed data populates on fresh database

### claude-security
- **Deliverables:**
  - Security architecture document
  - RBAC design (roles, permissions, enforcement)
  - Input validation specifications
  - RLS policy templates
  - Security test cases
  - Secrets management guide
- **Format:**
  - Threat model (common attacks, mitigations)
  - Policy templates (copy into migration files)
  - Test instructions (how to verify security)
  - Checklist (security review before deployment)
- **Definition of done:**
  - All threats identified & mitigated
  - RLS policies defined for all tables
  - Input validation rules specified (backend + frontend)
  - Security tests written & passing

### claude-testing
- **Deliverables:**
  - Test files (`.test.ts` or `.spec.ts`)
  - Test data fixtures (factory functions, seed data)
  - Test strategy document
  - Coverage reports
  - CI/CD test configuration
- **Format:**
  - Unit tests (functions in isolation)
  - Integration tests (with database)
  - E2E tests (full workflows)
  - Test data factories (TypeScript)
- **Definition of done:**
  - All critical paths tested
  - Coverage >80% on backend
  - CI runs tests on every PR
  - No flaky tests

### claude-operating
- **Deliverables:**
  - GitHub Actions workflows (`.yml` files)
  - Environment configuration (`.env.*` templates)
  - Deployment scripts
  - Monitoring setup (Sentry, Vercel Analytics config)
  - Operational runbook (deployment, rollback, troubleshooting)
  - Git workflow guide (branching, PR process)
- **Format:**
  - Workflows automated (no manual steps)
  - Environment variables documented
  - Secrets stored in Vercel (not git)
  - Rollback procedure documented
- **Definition of done:**
  - CI/CD pipeline runs on every PR
  - Deployment to Vercel automated on main merge
  - Monitoring alerts configured
  - Runbook can be followed by any team member

---

## I. Git Workflow

### Repository Setup
- **Remote:** GitHub (`origin`)
- **Default branch:** `main`
- **Protection:**
  - Require PR review (1+ approval)
  - Require status checks pass (lint, test, build)
  - Require branches up-to-date before merge

### Branching Strategy
- **Main branch:** Production-ready, deployable at any commit
- **Feature branches:** Created from `main`, naming convention:
  - Feature: `feature/invoice-module` or `feature/customer-crud`
  - Bug fix: `fix/auth-bug` or `fix/typo-in-dashboard`
  - Refactor: `refactor/db-queries`
  - Chore: `chore/update-deps`

### PR Workflow
1. **Create branch:** `git checkout -b feature/X-description`
2. **Commit regularly:** `git commit -m "Concise message"`
3. **Push to remote:** `git push -u origin feature/X-description`
4. **Open PR:** Title + description (what, why, testing done)
5. **Code review:** Cross-sub-agent if multi-agent change (e.g., frontend + backend)
6. **CI/CD runs:** Lint, type-check, test, build
7. **Merge:** Squash or rebase (keep main history clean)
8. **Auto-deploy:** Vercel deploys frontend, backend functions deployed

### Commit Message Convention
```
<type>(<scope>): <subject>

<body>

<footer>
```
- **Type:** feat, fix, refactor, test, chore, docs
- **Scope:** customers, invoices, auth, db, etc. (optional)
- **Subject:** Imperative mood, under 50 characters
- **Body:** Explain why, not what (optional)
- **Footer:** Refs #issue (optional)

**Example:**
```
feat(invoices): add send invoice endpoint

Implemented POST /api/invoices/:id/send to change status
and send email notification. Validates invoice is not already sent.

Refs #42
```

### Release Process
1. **Tag release:** `git tag -a v1.0.0 -m "Release v1.0.0"`
2. **Push tag:** `git push origin v1.0.0`
3. **GitHub Releases:** Create release notes (auto-generate from commit history)
4. **Database migrations:** If schema changes, tag migration with release version

### Merge Strategy
- Prefer **squash merge** (clean main history, one commit per feature)
- Fallback: **rebase & merge** (linear history, preserves commits)
- Avoid: **merge commit** (creates merge bubbles, clutters history)

### Branch Protection & CI/CD
- **Before merge:**
  - All status checks pass (lint, test, build)
  - At least 1 approval from code review
  - Branch is up-to-date with main
- **After merge:**
  - GitHub Actions deploys to Vercel (frontend)
  - Vercel serverless functions auto-deploy
  - E2E smoke tests run against prod
  - Slack notification (optional)

---

## Summary & Next Steps

| Phase | Goal | Duration | Owner |
|-------|------|----------|-------|
| **1** | Frontend UI running, dummy data | Quick setup | claude-frontend |
| **2** | Auth + RBAC + Supabase project | Foundation | claude-security, claude-database |
| **3** | Database schema + RLS + seed | Data model | claude-database |
| **4** | API specification + validation | Contract | claude-api |
| **5** | Backend endpoints implemented | Business logic | claude-backend |
| **6** | Frontend integrated to API | Full CRUD | claude-frontend |
| **7** | Testing + security validation | Quality gate | claude-testing, claude-security |
| **8** | Deployment + CI/CD + monitoring | Production ready | claude-operating |
| **9** | Advanced features (optional) | Post-MVP | All agents |

**Immediate Actions:**
1. Initialize GitHub repo + Vercel project (Phase 1, Step 1.1)
2. Set up Supabase project (Phase 2, Step 2.1)
3. Begin Phase 1 frontend scaffold (React + TypeScript + Tailwind)
4. Run in parallel: Phases 2 & 3 (auth, database setup)

---

*Document last updated: 2026-09-20*
