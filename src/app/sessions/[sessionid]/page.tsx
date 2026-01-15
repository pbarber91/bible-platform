// src/app/sessions/[sessionid]/page.tsx
import { redirect } from "next/navigation";
import { getPersonalTenantOrThrow } from "@/lib/tenant_personal";
import {
  getSessionById,
  updateSessionMeta,
  hardDeleteSession,
} from "@/lib/db/study_sessions";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function computeCompletionPercent(session: any): number {
  const r = (session?.responses ?? {}) as Record<string, any>;
  const track = String(session?.track ?? "beginner").toLowerCase();

  const baseKeys = ["obs", "aud", "mean", "sim", "diff", "app"];
  const advKeys = [
    "advStructure",
    "advThemes",
    "advCrossRefs",
    "advWordStudy",
    "advCommentary",
  ];
  const keys = track === "advanced" ? [...baseKeys, ...advKeys] : baseKeys;

  const filled = keys.filter((k) => String(r?.[k] ?? "").trim().length > 0).length;
  const total = keys.length;
  if (total === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((filled / total) * 100)));
}

function firstMissingAnchor(session: any): string {
  const r = (session?.responses ?? {}) as Record<string, any>;
  const track = String(session?.track ?? "beginner").toLowerCase();

  const base = ["obs", "aud", "mean", "sim", "diff", "app"];
  const adv = [
    "advStructure",
    "advThemes",
    "advCrossRefs",
    "advWordStudy",
    "advCommentary",
  ];
  const keys = track === "advanced" ? [...base, ...adv] : base;

  for (const k of keys) {
    if (String(r?.[k] ?? "").trim().length === 0) return `#${k}`;
  }
  return "#top";
}

async function deleteSessionAction(sessionId: string) {
  "use server";
  const tenant = await getPersonalTenantOrThrow();
  const session = await getSessionById(tenant.id, sessionId);
  if (!session) throw new Error("Session not found.");
  await hardDeleteSession({ workspaceId: tenant.id, sessionId });
  redirect(`/studies/${encodeURIComponent(session.plan_id)}`);
}

async function markCompleteAction(sessionId: string) {
  "use server";
  const tenant = await getPersonalTenantOrThrow();

  // IMPORTANT: updateSessionMeta requires a full set of fields, so fetch first.
  const session = await getSessionById(tenant.id, sessionId);
  if (!session) throw new Error("Session not found.");

  await updateSessionMeta({
    workspaceId: tenant.id,
    sessionId,
    session_date: session.session_date,
    passage: session.passage ?? null,
    track: session.track ?? null,
    mode: session.mode ?? null,
    genre: session.genre ?? null,
    status: "complete",
  });

  redirect(`/sessions/${encodeURIComponent(sessionId)}?done=1`);
}

export default async function SessionViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const sp = (await searchParams) ?? {};
  const done = sp.done === "1";

  const tenant = await getPersonalTenantOrThrow();
  const session = await getSessionById(tenant.id, p.sessionid);

  if (!session) {
    return (
      <div className="grid gap-6">
        <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="text-xs text-slate-500">Bible Study • Personal</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Session not found.
          </h1>
        </section>
      </div>
    );
  }

  const percent = computeCompletionPercent(session);
  const anchor = firstMissingAnchor(session);

  return (
    <div className="grid gap-6" id="top">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Bible Study • Personal</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {session.passage ? session.passage : "Study session"}
          </h1>
          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
              href={`/studies/${encodeURIComponent(session.plan_id)}`}
            >
              Back to study
            </a>

            <a
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
              href={anchor}
            >
              Resume
            </a>

            <a
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              href={`/sessions/${encodeURIComponent(session.id)}/edit`}
            >
              Open editor
            </a>

            <form action={deleteSessionAction.bind(null, session.id)}>
              <button
                type="submit"
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Delete
              </button>
            </form>
          </div>
        </div>

        <div className="mt-3 text-sm text-slate-600">
          {formatDate(session.session_date)}
        </div>

        <div className="mt-3 text-sm text-slate-700">
          Status: {session.status ?? "draft"} &nbsp; Completion: {percent}%
        </div>

        {done ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            Marked complete.
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold">Details</div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-500">Track</div>
            <div className="mt-1 text-sm font-semibold text-slate-800">
              {session.track ?? "beginner"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-500">Mode</div>
            <div className="mt-1 text-sm font-semibold text-slate-800">
              {session.mode ?? "guided"}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-500">Genre</div>
            <div className="mt-1 text-sm font-semibold text-slate-800">
              {session.genre ?? "Unknown"}
            </div>
          </div>
        </div>

        {String((session.responses ?? {})?.passageText ?? "").trim() ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold text-slate-500">
              Passage text (pasted)
            </div>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
              {String((session.responses ?? {})?.passageText ?? "")}
            </pre>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold">Mark complete</div>
        <form action={markCompleteAction.bind(null, session.id)} className="mt-3">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Mark complete
          </button>
        </form>
      </section>
    </div>
  );
}
