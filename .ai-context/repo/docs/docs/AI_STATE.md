\# AI\_STATE (Bible Platform)



Last updated: 2026-01-14 (America/New\_York)



\## What this repo is

A multi-tenant Bible learning platform built with Next.js App Router + Supabase.



Two usage modes:

\- \*\*Personal (default)\*\*: users can create studies/sessions outside any church context.

\- \*\*Church tenant\*\*: routes are scoped under `/{churchslug}` for church-specific portal + admin.



Primary goals (current phase):

1\) Establish a stable “spine” for Bible Study (Study Plans + Study Sessions).

2\) Keep Personal flow working end-to-end.

3\) Keep Church flow working end-to-end (same features, tenant-scoped).

4\) Admin flows exist (church-level roles; manage courses/sessions), but Bible Study is the priority now.



\## Runtime stack

\- Next.js App Router (React 19)

\- Supabase (Auth + Postgres + RLS + Views)

\- Tailwind CSS



\## Key routing map

\### Personal

\- `/studies` list studies

\- `/studies/new` create study

\- `/studies/\[planid]` study detail + sessions list + create session

\- `/sessions/\[sessionid]` session viewer

\- `/sessions/\[sessionid]/edit` session editor (guided)



\### Church tenant

\- `/{churchslug}` tenant home

\- `/{churchslug}/studies` list studies (tenant-scoped)

\- `/{churchslug}/studies/new` create study (tenant-scoped)

\- `/{churchslug}/studies/\[planid]` study detail + sessions list + create session

\- `/{churchslug}/sessions/\[sessionid]` session viewer (tenant-scoped)

\- `/{churchslug}/sessions/\[sessionid]/edit` session editor (tenant-scoped)



\### Admin (church tenant)

\- `/{churchslug}/admin` admin hub + requests

\- `/{churchslug}/admin/courses` manage courses

\- `/{churchslug}/admin/courses/new`

\- `/{churchslug}/admin/courses/\[courseslug]`

\- `/{churchslug}/admin/courses/\[courseslug]/sessions`

\- `/{churchslug}/admin/courses/\[courseslug]/sessions/new`

\- `/{churchslug}/admin/sessions/\[sessionid]`



\## Supabase / DB notes

\- Workspace = tenant concept.

\- A “Personal” workspace exists and is the default for personal routes.

\- Some “public” names are \*\*views\*\*, not base tables:

&nbsp; - `public.study\_plans` is a \*\*view\*\* over `study\_plans\_v2`

&nbsp; - `public.study\_sessions` is a \*\*view\*\* over `study\_sessions\_v2`

\- RLS must be applied to base tables, not the views.

\- `study\_sessions\_v2.genre` is NOT NULL (ensure UI always supplies a non-empty string).



\## Session editor parity goals (Flutter -> Next.js)

Flutter reference: `session\_editor.dart` and `session\_detail.dart`.



The session editor is \*\*guided\*\*, not just empty prompts:

\- Copy/help text changes automatically based on \*\*Track\*\* and \*\*Genre\*\*

\- Beginner is intentionally minimal: genre lens + paste passage + guided prompts (obs/app) + notes

\- Intermediate adds more guided sections

\- Advanced unlocks deep-dive prompts/tools

\- There is a “tools” concept (links/resources per section)

\- “Win moment” on completion with copy highlights + optional prayer



Current status:

\- Track/genre are wired and show/hide SOME sections.

\- Need deeper parity: all helper text, titles, hints, per-track structure, tools per card, and win moment.



\## Where the important code lives

\- Tenant resolution:

&nbsp; - `src/lib/tenant.ts` (church)

&nbsp; - `src/lib/tenant\_personal.ts` (personal)

\- Supabase clients:

&nbsp; - `src/lib/supabase/server.ts`

&nbsp; - `src/lib/supabase/client.ts`

\- Bible Study DB access:

&nbsp; - `src/lib/db/studies.ts`

&nbsp; - `src/lib/db/study\_sessions.ts`

\- Session editor UI:

&nbsp; - `src/components/session-editor/SessionEditorForm.tsx`

\- Auth:

&nbsp; - `src/lib/auth.ts`

&nbsp; - `src/app/(auth)/login/page.tsx`

&nbsp; - `src/app/auth/callback/route.ts`

&nbsp; - `src/app/logout/route.ts`



\## Testing checklist (quick)

Personal:

\- Create study -> create session -> editor save -> viewer displays -> mark complete



Church:

\- Visit `/{churchslug}` -> studies list -> create study -> create session -> editor save -> viewer displays



Admin:

\- `/{churchslug}/admin` loads for admin role

\- Courses list + create + edit + manage sessions works



\## Working agreements (to avoid regressions)

\- No breaking route changes without explicit intent.

\- Keep Personal and Church flows feature-parity whenever possible.

\- Prefer drop-in replacements for full files (not partial diffs) when changing UI screens.

\- Keep DB contracts stable; if schema changes are required, create a numbered SQL migration and document it here.



\## Next work items (suggested order)

1\) Session editor parity: implement track-driven copy titles/helpers/hints + beginner minimal layout

2\) Tools per section (links panel)

3\) Win moment on completion (web equivalent)

4\) Viewer improvements (completion %, resume)

5\) Deeper admin later (members/roles/instructors)



