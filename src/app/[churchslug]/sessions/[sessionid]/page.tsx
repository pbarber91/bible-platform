// src/app/[churchslug]/sessions/[sessionid]/page.tsx
import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { getSessionById, updateSessionMeta, hardDeleteSession } from "@/lib/db/study_sessions";
import { ConfirmDangerAction } from "@/components/ConfirmDangerAction";

const FIXED_LOCALE = "en-US";
const FIXED_TZ = "America/New_York";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const fmt = new Intl.DateTimeFormat(FIXED_LOCALE, {
      timeZone: FIXED_TZ,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return fmt.format(d);
  } catch {
    return iso;
  }
}

function computeCompletionPercent(session: any): number {
  const r = (session?.responses ?? {}) as Record<string, unknown>;
  const track = String(session?.track ?? "beginner").toLowerCase();
  const baseKeys = ["obs", "aud", "mean", "sim", "diff", "app"];
  const advKeys = ["advStructure", "advThemes", "advCrossRefs", "advWordStudy", "advCommentary"];
  const keys = track === "advanced" ? [...baseKeys, ...advKeys] : baseKeys;

  const filled = keys.filter((k) => String((r as any)?.[k] ?? "").trim().length > 0).length;
  const total = keys.length;
  if (total === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((filled / total) * 100)));
}

function firstMissingAnchor(session: any): string {
  const r = (session?.responses ?? {}) as Record<string, unknown>;
  const track = String(session?.track ?? "beginner").toLowerCase();
  const base = ["obs", "aud", "mean", "sim", "diff", "app"];
  const adv = ["advStructure", "advThemes", "advCrossRefs", "advWordStudy", "advCommentary"];
  const keys = track === "advanced" ? [...base, ...adv] : base;

  for (const k of keys) {
    if (String((r as any)?.[k] ?? "").trim().length === 0) return `#${k}`;
  }
  return "#top";
}

type CheckLevel = "pass" | "warn" | "fail" | "none";

function versePatternHit(s: string) {
  return /\b\d{1,3}:\d{1,3}\b/.test(s);
}
function connectorHit(s: string) {
  return /\b(because|therefore|so that|since|in light of|as a result)\b/i.test(s);
}
function quoteHit(s: string) {
  return /"([^"]{8,})"/.test(s) || /“([^”]{8,})”/.test(s);
}

function anchoredStatus(app: string): CheckLevel {
  const a = (app ?? "").trim();
  if (!a) return "none";
  const ok = versePatternHit(a) || connectorHit(a) || quoteHit(a);
  if (ok) return "pass";
  if (a.length >= 40) return "warn";
  return "fail";
}

function measurableStatus(app: string): CheckLevel {
  const a = (app ?? "").trim();
  if (!a) return "none";
  const timeMarker =
    /\b(today|tonight|tomorrow|this week|this month|by\b|before\b|daily\b|weekly\b|on (mon|tue|wed|thu|thur|fri|sat|sun)\b|\b\d+\s?(min|mins|minute|minutes|day|days|week|weeks)\b)/i.test(
      a
    );
  const concreteVerb =
    /\b(call|text|talk|apologize|forgive|pray|read|memorize|journal|fast|serve|share|confess|meet|invite|encourage|give|write|listen|visit)\b/i.test(
      a
    );
  if (timeMarker && concreteVerb) return "pass";
  if (timeMarker || concreteVerb) return "warn";
  return "fail";
}

function godCenteredStatus(app: string): CheckLevel {
  const a = (app ?? "").trim();
  if (!a) return "none";
  const godWords = /\b(God|Jesus|Christ|Spirit|Holy Spirit|grace|gospel|prayer|obedience|faith)\b/i.test(a);
  const postureWords = /\b(repenten|repent|humble|humility|forgive|forgiveness|serve|worship)\b/i.test(a);
  const explicitlySelfOnly = /\b(manifest|be a better person)\b/i.test(a);
  if (explicitlySelfOnly) return "fail";
  if (godWords || postureWords) return "pass";
  return "warn";
}

function checkBadge(level: CheckLevel) {
  if (level === "pass") return { emoji: "✅", cls: "border-emerald-200 bg-emerald-50 text-emerald-900" };
  if (level === "warn") return { emoji: "⚠️", cls: "border-amber-200 bg-amber-50 text-amber-900" };
  if (level === "fail") return { emoji: "⛔", cls: "border-rose-200 bg-rose-50 text-rose-900" };
  return { emoji: "•", cls: "border-slate-200 bg-slate-50 text-slate-700" };
}

function buildShareText(metaLine: string, sections: Array<{ label: string; value: string }>) {
  const lines: string[] = [];
  lines.push("Session Summary");
  lines.push(metaLine);
  lines.push("");
  for (const s of sections) {
    if (!String(s.value ?? "").trim()) continue;
    lines.push(`${s.label}:`);
    lines.push(String(s.value ?? "").trim());
    lines.push("");
  }
  return lines.join("\n");
}

async function deleteSessionAction(args: { churchslug: string; sessionId: string }) {
  "use server";
  const tenant = await getTenantBySlugOrThrow(args.churchslug);
  const session = await getSessionById(tenant.id, args.sessionId);
  if (!session) throw new Error("Session not found.");
  await hardDeleteSession({ workspaceId: tenant.id, sessionId: args.sessionId });
  redirect(`/${encodeURIComponent(args.churchslug)}/studies/${encodeURIComponent(session.plan_id)}`);
}

async function markCompleteAction(args: { churchslug: string; sessionId: string }) {
  "use server";
  const tenant = await getTenantBySlugOrThrow(args.churchslug);
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

  redirect(`/${encodeURIComponent(args.churchslug)}/sessions/${encodeURIComponent(args.sessionId)}?done=1`);
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
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold text-slate-700">Bible Study</div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Session not found.</h1>
        </div>
      </div>
    );
  }

  const percent = computeCompletionPercent(session);
  const anchor = firstMissingAnchor(session);

  const r = (session.responses ?? {}) as Record<string, unknown>;
  const track = String(session.track ?? "beginner");
  const mode = String(session.mode ?? "guided");
  const genre = String(session.genre ?? "Unknown");
  const metaLine = `Track: ${track} • Mode: ${mode} • Genre: ${genre === "Unknown" ? "General" : genre}`;

  const pageTitle = session.passage ? String(session.passage) : "Study session";
  const contextLabel = `Bible Study • ${tenant.name}`;
  const dateLabel = formatDate(session.session_date);

  const sectionDefs: Array<{ key: string; label: string }> = [
    { key: "obs", label: "Observations" },
    { key: "aud", label: "Original audience" },
    { key: "mean", label: "Meaning (then)" },
    { key: "sim", label: "Similarities (bridge)" },
    { key: "diff", label: "Differences (guardrails)" },
    { key: "app", label: "Application / response" },
  ];

  const advDefs: Array<{ key: string; label: string }> = [
    { key: "advStructure", label: "Advanced — Structure / flow" },
    { key: "advThemes", label: "Advanced — Themes" },
    { key: "advCrossRefs", label: "Advanced — Cross references" },
    { key: "advWordStudy", label: "Advanced — Word study" },
    { key: "advCommentary", label: "Advanced — Commentary / questions" },
  ];

  const sections: Array<{ label: string; value: string }> = [];
  const passageText = String((r as any)?.passageText ?? "");
  if (passageText.trim()) sections.push({ label: "Passage text (pasted)", value: passageText });

  for (const s of sectionDefs) {
    const v = String((r as any)?.[s.key] ?? "");
    if (v.trim()) sections.push({ label: s.label, value: v });
  }

  if (String(session.track ?? "").toLowerCase() === "advanced") {
    for (const s of advDefs) {
      const v = String((r as any)?.[s.key] ?? "");
      if (v.trim()) sections.push({ label: s.label, value: v });
    }
  }

  const notes = String((r as any)?.notes ?? "");
  if (notes.trim()) sections.push({ label: "Notes", value: notes });

  const app = String((r as any)?.app ?? "");
  const a = anchoredStatus(app);
  const m2 = measurableStatus(app);
  const g = godCenteredStatus(app);

  const shareText = buildShareText(
    `${contextLabel} • ${pageTitle} • ${dateLabel} • ${metaLine} • Completion: ${percent}%`,
    sections
  );

  const backToStudyHref = `/${encodeURIComponent(p.churchslug)}/studies/${encodeURIComponent(session.plan_id)}`;
  const resumeHref = `${backToStudyHref}${anchor}`;
  const editorHref = `/${encodeURIComponent(p.churchslug)}/sessions/${encodeURIComponent(p.sessionid)}/edit`;

  return (
    <div id="top" className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-700">{contextLabel}</div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{pageTitle}</h1>
            <div className="mt-2 text-sm text-slate-600">{dateLabel}</div>
            <div className="mt-1 text-sm text-slate-600">
              Status: <span className="font-semibold text-slate-900">{session.status ?? "draft"}</span> • Completion:{" "}
              <span className="font-semibold text-slate-900">{percent}%</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={backToStudyHref}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Back to study
            </a>
            <a
              href={resumeHref}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Resume
            </a>
            <a
              href={editorHref}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Open editor
            </a>

            <ConfirmDangerAction
              buttonLabel="Delete"
              title="Delete this session?"
              message="This will permanently delete this session and all of its responses."
              dangerHint="This cannot be undone."
              action={deleteSessionAction.bind(null, { churchslug: p.churchslug, sessionId: p.sessionid })}
            />
          </div>
        </div>

        {done ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Marked complete.
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Session summary</div>
          <div className="mt-1 text-sm text-slate-600">
            A printable/shareable summary of your session (no AI — just what you wrote).
          </div>

          <div className="mt-3 text-sm text-slate-700">
            {metaLine} <span className="text-slate-400">•</span> Completion: {percent}%
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              onClick={() => {
                try {
                  navigator.clipboard.writeText(shareText);
                } catch {
                  // ignore
                }
              }}
            >
              Copy summary
            </button>

            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              onClick={() => {
                try {
                  if (navigator.share) {
                    navigator.share({ title: "Session Summary", text: shareText });
                  } else {
                    navigator.clipboard.writeText(shareText);
                  }
                } catch {
                  // ignore
                }
              }}
            >
              Share
            </button>

            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              onClick={() => window.print()}
            >
              Export (Print/PDF)
            </button>

            {session.status !== "complete" ? (
              <form action={markCompleteAction.bind(null, { churchslug: p.churchslug, sessionId: p.sessionid })}>
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Mark complete
                </button>
              </form>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(() => {
              const b = checkBadge(a);
              return (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${b.cls}`}>
                  <div className="font-semibold">
                    {b.emoji} Anchored to the text
                  </div>
                  <div className="mt-1 text-xs">
                    {a === "pass"
                      ? "Looks anchored."
                      : a === "warn"
                      ? "Consider adding a verse reference or a “because/therefore” connection."
                      : a === "fail"
                      ? "This reads unanchored — tie it to an observation or verse."
                      : "No application written yet."}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const b = checkBadge(m2);
              return (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${b.cls}`}>
                  <div className="font-semibold">
                    {b.emoji} Specific + measurable
                  </div>
                  <div className="mt-1 text-xs">
                    {m2 === "pass"
                      ? "Clear action + timeframe."
                      : m2 === "warn"
                      ? "Add a timeframe or concrete action (who/what/when)."
                      : m2 === "fail"
                      ? "This is vague — consider rewriting with a template."
                      : "No application written yet."}
                  </div>
                </div>
              );
            })()}

            {(() => {
              const b = checkBadge(g);
              return (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${b.cls}`}>
                  <div className="font-semibold">
                    {b.emoji} God-centered motive
                  </div>
                  <div className="mt-1 text-xs">
                    {g === "pass"
                      ? "Reads God-centered."
                      : g === "warn"
                      ? "Consider adding motive: “because God…” “in response to…”"
                      : g === "fail"
                      ? "This reads self-centered — reframe as response to what God has done/said."
                      : "No application written yet."}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="mt-5 space-y-4">
            {sections.length ? (
              sections.map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                  <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{s.value}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                No content yet — jump back to the editor to add observations and application.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
