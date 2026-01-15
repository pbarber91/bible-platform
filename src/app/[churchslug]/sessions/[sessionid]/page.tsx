// src/app/[churchslug]/sessions/[sessionid]/page.tsx
import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import {
  getSessionById,
  updateSessionMeta,
  hardDeleteSession,
} from "@/lib/db/study_sessions";

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
  const advKeys = [
    "advStructure",
    "advThemes",
    "advCrossRefs",
    "advWordStudy",
    "advCommentary",
  ];

  const keys = track === "advanced" ? [...baseKeys, ...advKeys] : baseKeys;

  const filled = keys.filter(
    (k) => String((r as any)?.[k] ?? "").trim().length > 0
  ).length;

  const total = keys.length;
  if (total === 0) return 0;

  return Math.max(0, Math.min(100, Math.round((filled / total) * 100)));
}

function firstMissingAnchor(session: any): string {
  const r = (session?.responses ?? {}) as Record<string, unknown>;
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

  const godWords =
    /\b(God|Jesus|Christ|Spirit|Holy Spirit|grace|gospel|prayer|obedience|faith)\b/i.test(a);
  const postureWords =
    /\b(repenten|repent|humble|humility|forgive|forgiveness|serve|worship)\b/i.test(a);

  const explicitlySelfOnly = /\b(manifest|be a better person)\b/i.test(a);

  if (explicitlySelfOnly) return "fail";
  if (godWords || postureWords) return "pass";
  return "warn";
}

function checkBadge(level: CheckLevel) {
  if (level === "pass")
    return { emoji: "✅", cls: "border-emerald-200 bg-emerald-50 text-emerald-900" };
  if (level === "warn")
    return { emoji: "🟡", cls: "border-amber-200 bg-amber-50 text-amber-900" };
  if (level === "fail")
    return { emoji: "🔴", cls: "border-rose-200 bg-rose-50 text-rose-900" };
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
  redirect(
    `/${encodeURIComponent(args.churchslug)}/studies/${encodeURIComponent(session.plan_id)}`
  );
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

  redirect(
    `/${encodeURIComponent(args.churchslug)}/sessions/${encodeURIComponent(args.sessionId)}?done=1`
  );
}

export default async function ChurchSessionViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ churchslug: string; sessionid: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const p = await params;
  const sp = (await searchParams) ?? {};
  const done = sp.done === "1";

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  const session = await getSessionById(tenant.id, p.sessionid);

  if (!session) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-sm font-semibold text-slate-700">Bible Study</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Session not found.
        </h1>
      </div>
    );
  }

  const percent = computeCompletionPercent(session);
  const anchor = firstMissingAnchor(session);

  return (
    <div id="top" className="mx-auto max-w-3xl px-4 pb-16 pt-8">
      <div className="text-sm font-semibold text-slate-700">
        Bible Study • {tenant.name}
      </div>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
        {session.passage ? session.passage : "Study session"}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <a
          href={`/${encodeURIComponent(p.churchslug)}/studies/${encodeURIComponent(session.plan_id)}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Back to study
        </a>

        <a
          href={anchor}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Resume
        </a>

        <a
          href={`/${encodeURIComponent(p.churchslug)}/sessions/${encodeURIComponent(session.id)}/edit`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Open editor
        </a>

        <form
          action={deleteSessionAction.bind(null, {
            churchslug: p.churchslug,
            sessionId: session.id,
          })}
        >
          <button
            type="submit"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-900 hover:bg-rose-100"
          >
            Delete
          </button>
        </form>
      </div>

      <div className="mt-4 text-sm text-slate-600">{formatDate(session.session_date)}</div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <div>
          Status: <span className="font-semibold text-slate-800">{session.status ?? "draft"}</span>
        </div>
        <div>•</div>
        <div>
          Completion: <span className="font-semibold text-slate-800">{percent}%</span>
        </div>
      </div>

      {done ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          Marked complete.
        </div>
      ) : null}

      {(() => {
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
          { key: "advCrossRefs", label: "Advanced — Word study" },
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

        return (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">Session summary</div>
                <div className="mt-1 text-sm text-slate-600">
                  A printable/shareable summary of your session (no AI — just what you wrote).
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                    {metaLine}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                    Completion: {percent}%
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  data-bsh-action="copy"
                  data-bsh-text={JSON.stringify(shareText)}
                >
                  Copy summary
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  data-bsh-action="share"
                  data-bsh-text={JSON.stringify(shareText)}
                  data-bsh-title={JSON.stringify(pageTitle)}
                >
                  Share
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                  data-bsh-action="print"
                  data-bsh-title={JSON.stringify(pageTitle)}
                  data-bsh-context={JSON.stringify(contextLabel)}
                  data-bsh-date={JSON.stringify(dateLabel)}
                  data-bsh-percent={JSON.stringify(String(percent))}
                  data-bsh-meta={JSON.stringify(metaLine)}
                  data-bsh-sections={JSON.stringify(sections)}
                >
                  Export (Print/PDF)
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {sections.length ? (
                sections.map((s) => (
                  <section
                    key={s.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{s.value}</div>
                  </section>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  No content yet — jump back to the editor to add observations and application.
                </div>
              )}
            </div>

            <script
              suppressHydrationWarning
              dangerouslySetInnerHTML={{
                __html: `(function(){
  function decodeJSON(s){ try { return JSON.parse(s); } catch(e){ return s || ""; } }
  async function copyText(t){
    try{ if(navigator.clipboard && navigator.clipboard.writeText){ await navigator.clipboard.writeText(t); return true; } }catch(e){}
    try{
      var ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.focus(); ta.select();
      var ok=document.execCommand('copy'); document.body.removeChild(ta); return ok;
    }catch(e){ return false; }
  }
  function esc(s){ return String(s||"").replace(/[&<>"]/g,function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]);}); }
  function renderPrintHtml(contextLabel, title, date, percent, meta, sections){
    var html = [];
    html.push('<!doctype html><html><head><meta charset="utf-8" />');
    html.push('<title>'+esc(title)+'</title>');
    html.push('<style>body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; margin:32px; color:#0f172a;} h1{margin:0; font-size:22px;} .kicker{color:#475569; font-weight:700; font-size:12px; text-transform:uppercase; letter-spacing:.06em;} .hdr{border:1px solid #e2e8f0; border-radius:14px; padding:14px; margin:0 0 16px;} .meta{color:#475569; margin-top:8px; font-size:12px;} .meta b{color:#0f172a;} .card{border:1px solid #e2e8f0; border-radius:14px; padding:14px; margin:12px 0;} .h{font-weight:700; margin-bottom:8px; font-size:13px;} .t{white-space:pre-wrap; font-size:13px; color:#334155;} @media print{ body{margin:18mm;} }</style>');
    html.push('</head><body>');
    html.push('<div class="hdr">');
    html.push('<div class="kicker">'+esc(contextLabel)+'</div>');
    html.push('<h1>'+esc(title)+'</h1>');
    html.push('<div class="meta"><b>Date:</b> '+esc(date)+' &nbsp; • &nbsp; <b>Completion:</b> '+esc(percent)+'%<br />'+esc(meta)+'</div>');
    html.push('</div>');
    (sections||[]).forEach(function(s){
      html.push('<div class="card"><div class="h">'+esc(s.label)+'</div><div class="t">'+esc(s.value)+'</div></div>');
    });
    html.push('</body></html>');
    return html.join('');
  }
  document.addEventListener('click', async function(e){
    var btn = e.target && e.target.closest ? e.target.closest('[data-bsh-action]') : null;
    if(!btn) return;
    var action = btn.getAttribute('data-bsh-action');
    if(action==='copy' || action==='share'){
      var text = decodeJSON(btn.getAttribute('data-bsh-text')||"");
      if(action==='share' && navigator.share){
        try{
          var title = decodeJSON(btn.getAttribute('data-bsh-title')||"Session Summary");
          await navigator.share({ title: title, text: text });
          return;
        }catch(err){}
      }
      var ok = await copyText(String(text||""));
      if(ok){
        btn.textContent = action==='copy' ? 'Copied' : 'Copied (share not supported)';
        setTimeout(function(){ btn.textContent = action==='copy' ? 'Copy summary' : 'Share'; }, 1600);
      }
      return;
    }
    if(action==='print'){
      var title = decodeJSON(btn.getAttribute('data-bsh-title')||"Study session");
      var contextLabel = decodeJSON(btn.getAttribute('data-bsh-context')||"Bible Study");
      var date = decodeJSON(btn.getAttribute('data-bsh-date')||"");
      var percent = decodeJSON(btn.getAttribute('data-bsh-percent')||"0");
      var meta = decodeJSON(btn.getAttribute('data-bsh-meta')||"");
      var sections = decodeJSON(btn.getAttribute('data-bsh-sections')||"[]");
      try{
        var w = window.open('', '_blank');
        if(!w) return;
        w.document.open();
        w.document.write(renderPrintHtml(contextLabel, title, date, percent, meta, sections));
        w.document.close();
        w.focus();
        setTimeout(function(){ w.print(); }, 250);
      }catch(err){}
    }
  }, true);
})();`,
              }}
            />
          </section>
        );
      })()}

      <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-semibold">Mark complete</div>
        <form
          action={markCompleteAction.bind(null, {
            churchslug: p.churchslug,
            sessionId: session.id,
          })}
          className="mt-3"
        >
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
