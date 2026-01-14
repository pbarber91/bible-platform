import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { getSessionById, updateSessionMeta } from "@/lib/db/study_sessions";

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

async function markCompleteAction(args: { churchslug: string; sessionId: string }) {
  "use server";

  const tenant = await getTenantBySlugOrThrow(args.churchslug);

  // IMPORTANT: updateSessionMeta requires a full set of fields, so fetch first.
  const session = await getSessionById(tenant.id, args.sessionId);
  if (!session) throw new Error("Session not found.");

  await updateSessionMeta({
    workspaceId: tenant.id,
    sessionId: args.sessionId,
    session_date: session.session_date,
    passage: session.passage ?? null,
    track: session.track ?? null,
    mode: session.mode ?? null,
    genre: session.genre ?? null,
    status: "complete",
  });

  redirect(
    `/${encodeURIComponent(args.churchslug)}/sessions/${encodeURIComponent(
      args.sessionId
    )}?done=1`
  );
}

export default async function ChurchSessionViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ churchslug: string; sessionid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const sp = (await searchParams) ?? {};
  const done = sp.done === "1";

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  const session = await getSessionById(tenant.id, p.sessionid);

  if (!session) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        Session not found.
      </div>
    );
  }

  const percent = computeCompletionPercent(session);
  const anchor = firstMissingAnchor(session);

  return (
    <div className="grid gap-6" id="top">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Bible Study • {tenant.name}</div>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {session.passage ? session.passage : "Study session"}
            </h1>
            <div className="mt-2 text-sm text-slate-600">
              {formatDate(session.session_date)}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                Status: {session.status ?? "draft"}
              </span>
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                Completion: {percent}%
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
              href={`/${encodeURIComponent(p.churchslug)}/studies/${encodeURIComponent(
                session.plan_id
              )}`}
            >
              Back to study
            </a>

            <a
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              href={`/${encodeURIComponent(p.churchslug)}/sessions/${encodeURIComponent(
                session.id
              )}/edit${anchor}`}
            >
              Resume
            </a>

            <a
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              href={`/${encodeURIComponent(p.churchslug)}/sessions/${encodeURIComponent(
                session.id
              )}/edit`}
            >
              Open editor
            </a>
          </div>
        </div>

        {done ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Marked complete.
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 text-sm font-semibold">Details</div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-600">Track</div>
            <div className="mt-1 text-sm">{session.track ?? "beginner"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-600">Mode</div>
            <div className="mt-1 text-sm">{session.mode ?? "guided"}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs font-semibold text-slate-600">Genre</div>
            <div className="mt-1 text-sm">{session.genre ?? "Unknown"}</div>
          </div>
        </div>

        {String((session.responses ?? {})?.passageText ?? "").trim() ? (
          <details className="mt-4 rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Passage text (pasted)
            </summary>
            <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
              {String((session.responses ?? {})?.passageText ?? "")}
            </pre>
          </details>
        ) : null}

        <div className="mt-6 flex justify-end">
          <form
            action={markCompleteAction.bind(null, {
              churchslug: p.churchslug,
              sessionId: session.id,
            })}
          >
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Mark complete
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
