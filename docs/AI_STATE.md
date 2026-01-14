# AI_STATE.md — bible-platform

Last updated: 2026-01-14  
Owner: PJ  
Primary stack: Next.js App Router (Next 16), React 19, TypeScript, Tailwind 4, Supabase (Postgres + Auth)

## Project goal
A Bible Tools platform that supports:
- **Church-scoped** experiences via route prefix `/:churchslug/...`
- **Personal** experiences (no church required) via non-prefixed routes `/studies`, `/sessions`, etc.
- **Courses** (church) with enrollments/progress
- **Bible Study** (personal + church) with a guided session editor inspired by Flutter app

Design note: UI aesthetics will be refined later (“Geeks-like layout”), but current focus is **spine + functionality**.

---

## Routing model

### Personal (default)
- `/studies` — list study plans
- `/studies/new` — create study plan
- `/studies/[planid]` — study detail + sessions list + create session
- `/sessions/[sessionid]` — session viewer
- `/sessions/[sessionid]/edit` — session editor (guided)

Personal tenant/workspace is resolved via:
- `src/lib/tenant_personal.ts` (helper: `getPersonalTenantOrThrow()`)

### Church-scoped
- `/:churchslug` — church home
- `/:churchslug/courses` — published courses
- `/:churchslug/courses/[courseslug]` — course detail
- `/:churchslug/courses/[courseslug]/sessions/[sessionid]` — course session page

Bible Study (church-scoped mirror):
- `/:churchslug/studies`
- `/:churchslug/studies/new`
- `/:churchslug/studies/[planid]`
- `/:churchslug/sessions/[sessionid]`
- `/:churchslug/sessions/[sessionid]/edit`

Church tenant/workspace is resolved via:
- `src/lib/tenant.ts` (helper: `getTenantBySlugOrThrow(churchslug)`)

### Auth
- Magic link sign-in
- Callback route handles code exchange:
  - `src/app/auth/callback/route.ts`
- Logout:
  - `src/app/logout/route.ts`

---

## Supabase data model (high level)

### Workspaces (tenants)
- `workspaces` table
- `slug` may be mixed-case; routing uses `churchslug` lowercased and queries should be case-insensitive fallback.
- Personal workspace exists (default).

### Bible Study tables
- `study_plans_v2` (base table)
- `study_sessions_v2` (base table)

Views exist for convenience:
- `study_plans` view → selects from `study_plans_v2`
- `study_sessions` view → selects from `study_sessions_v2`

Important constraint:
- `study_sessions_v2.genre` is **NOT NULL**
- `study_sessions_v2.session_date` is `timestamptz`
- `study_sessions_v2.responses` is `jsonb` (stores editor answers)

### Progress / Courses
- Church courses and progress exist; admin can manage courses and sessions.
- Admin pages gate by workspace role (admin/owner).

---

## Session editor “source of truth”
Flutter reference: `session_editor.dart` (guidance-heavy, track+genre adaptive, tools links, win-moment completion).

Next.js implementation target:
- `src/components/session-editor/SessionEditorForm.tsx`
- Session editor pages should render this form for both personal + church routes.

Key behavior expectations:
- Track + genre should adapt **immediately in UI** (no “save then reopen”).
- Beginner track should be minimal:
  - Genre lens + tools
  - Paste passage text (optional)
  - Guided prompts: Observation + Application/Response
  - Notes
- Intermediate/Advanced progressively add depth and additional cards.
- “Tools” button per section (external references) should exist where helpful.
- Completion “win moment” exists on marking complete (summary of first meaningful observation + application, optional prayer, copy highlights).

---

## Key files & responsibilities

### Tenant / auth
- `src/lib/tenant.ts` — church workspace resolve
- `src/lib/tenant_personal.ts` — personal workspace resolve
- `src/lib/auth.ts` — session/user helpers
- `src/lib/supabase/server.ts` — server client
- `src/lib/supabase/client.ts` — browser client (if/when needed)

### Bible study DB layer
- `src/lib/db/studies.ts`
- `src/lib/db/study_sessions.ts`

### Session UI
- Viewer pages:
  - `src/app/sessions/[sessionid]/page.tsx`
  - `src/app/[churchslug]/sessions/[sessionid]/page.tsx`
- Editor pages:
  - `src/app/sessions/[sessionid]/edit/page.tsx`
  - `src/app/[churchslug]/sessions/[sessionid]/edit/page.tsx`
- Core form component:
  - `src/components/session-editor/SessionEditorForm.tsx`

---

## Dev notes
- Next.js 16.1 uses async route params in some contexts (`params` can be a Promise).
- Turbopack behavior may vary; default dev uses Turbopack in Next 16.
- Windows/PowerShell environment.
- Ensure `.env.local` never committed.

---

## Current priorities (spine)
1) Bible Study: guided session editor parity with Flutter (copy/help/tools/show-hide by track+genre)
2) Admin dashboards: roles + course/session creation and navigation (already scaffolded)
3) UI polish later (Geeks-like styling and home tiles, etc.)

