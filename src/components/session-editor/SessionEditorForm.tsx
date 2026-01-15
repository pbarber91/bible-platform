// src/components/session-editor/SessionEditorForm.tsx
"use client";

import * as React from "react";

export type StudyTrack = "beginner" | "intermediate" | "advanced";

export type SessionEditorDefaults = {
  passage: string;
  track: StudyTrack;
  mode: "guided" | "free";
  genre: string;
  status: "draft" | "complete";
  session_date: string;

  obs: string;
  aud: string;
  mean: string;
  sim: string;
  diff: string;
  app: string;

  passageText: string;
  notes: string;

  advStructure: string;
  advThemes: string;
  advCrossRefs: string;
  advWordStudy: string;
  advCommentary: string;
};

type Props = {
  tenantLabel: string;
  saved?: boolean;
  /** When true, requests the Win Moment modal to show. (We will still de-dupe via winMomentId.) */
  showWinMoment?: boolean;
  /**
   * A unique id for this Win Moment event (e.g. sessionId + win_token).
   * This enables "open only once" even if the user refreshes the page.
   */
  winMomentId?: string;

  backToViewerHref: string;
  backToStudyHref: string;
  defaults: SessionEditorDefaults;
  action: (formData: FormData) => void;
};

type ToolLink = { label: string; url: string; tooltip: string };

const GENRES = [
  "Unknown",
  "Narrative",
  "Gospel",
  "Poetry/Wisdom",
  "Law",
  "Epistle",
  "Prophecy",
  "Apocalyptic",
] as const;

function normalizeGenreLabel(raw: string): string {
  const v = (raw || "").trim();
  if (!v) return "Unknown";
  if (v === "Poetry" || v === "Wisdom") return "Poetry/Wisdom";
  return v;
}

function trackLabel(track: StudyTrack) {
  if (track === "beginner") return "Beginner";
  if (track === "intermediate") return "Intermediate";
  return "Advanced";
}

function trackSummary(track: StudyTrack) {
  if (track === "beginner") return "Simple + practical";
  if (track === "intermediate") return "Adds context";
  return "Deep dive";
}

function genreObservationHint(genre: string) {
  switch (normalizeGenreLabel(genre)) {
    case "Poetry/Wisdom":
      return "Write observations about imagery/parallelism/contrasts.\nAvoid jumping to meaning yet.";
    case "Epistle":
      return "Track the author’s logic: claims → reasons → implications (“therefore”).";
    case "Narrative":
      return "Track who/what/where, and what changes in the story.";
    case "Law":
      return "Note who is addressed, what is required, and any conditions (“if”).";
    case "Prophecy":
      return "Note warnings/promises and repeated images; watch for “return/repent” language.";
    case "Apocalyptic":
      return "Note repeated symbols/images and what contrast they create.";
    case "Gospel":
      return "Note Jesus’ actions/words and repeated themes; how do people respond?";
    default:
      return "Write text-based observations.\nUse the tools if you’re not sure where to start.";
  }
}

function copyObsTitle(track: StudyTrack) {
  switch (track) {
    case "beginner":
      return "1) What do you notice?";
    case "intermediate":
      return "1) Important words / observations";
    case "advanced":
      return "1) Observations (imperatives / flow)";
  }
}

function copyObsHelper(track: StudyTrack) {
  switch (track) {
    case "beginner":
      return "Slow down and list what you see in the text (repeated words, people, actions, “because/therefore”, contrasts).";
    case "intermediate":
      return "Observation = what the text says.\nStart with repeated words, people, contrasts, cause/effect.";
    case "advanced":
      return "Stay text-first.\nMark imperatives, discourse flow (claims → reasons → implications), contrasts, and repeated terms.";
  }
}

function copyObsHint(track: StudyTrack, genre: string) {
  const base = genreObservationHint(genre);
  switch (track) {
    case "beginner":
      return `${base}\n\nStarter: “I notice ___.”`;
    case "intermediate":
      return base;
    case "advanced":
      return `${base}\n\nAlso note: imperatives, conjunctions (“therefore/because”), and argument structure.`;
  }
}

function copyAppHelper(track: StudyTrack) {
  switch (track) {
    case "beginner":
      return "Write one clear response that you can actually do this week.\nKeep it simple and honest.";
    case "intermediate":
      return "Write a specific response that is faithful to the text and wise for today.";
    case "advanced":
      return "State a text-grounded obedience response (motive + measurable step + timeframe).\nKeep it God-centered.";
  }
}

function copyAppHint(track: StudyTrack) {
  switch (track) {
    case "advanced":
      return "Example: “Therefore, I will ___ because ___ (tied to the text), by ___, so that ___.”";
    default:
      return "Example: “This week I will ___ because ___ … by ___.”";
  }
}

function contextChecklist(genre: string): string[] {
  switch (normalizeGenreLabel(genre)) {
    case "Epistle":
      return [
        "Who wrote it? What relationship do they have?",
        "Who received it? What situation are they in?",
        "Why was it written (occasion/problem)?",
        "Key themes repeated in the letter.",
        "What “therefore” is pointing back to.",
        "What the audience assumes from OT/covenant.",
      ];
    case "Narrative":
    case "Gospel":
      return [
        "Where/when is this happening in the story?",
        "Who is speaking? Who is listening?",
        "What cultural/religious practice is assumed?",
        "What happened right before this scene?",
        "Why is this moment included?",
        "What would shock/comfort the first audience?",
      ];
    case "Poetry/Wisdom":
      return [
        "What life setting (lament/praise/wisdom)?",
        "What emotion/tone is driving the words?",
        "What ancient imagery is used (shepherd, courts, fields)?",
        "What contrasts are emphasized?",
        "What covenant assumptions exist?",
        "How would Israel hear this language?",
      ];
    case "Law":
      return [
        "Who is addressed (Israel/priests/people)?",
        "Where are they in the story (Sinai/wilderness)?",
        "What does this protect/teach about holiness?",
        "Scope/conditions (when/where/for whom).",
        "What covenant terms repeat?",
        "How would this shape community life?",
      ];
    case "Prophecy":
      return [
        "Which people/nation is addressed?",
        "What covenant problem is confronted?",
        "Warnings, promises, or both?",
        "Historical crisis in the background?",
        "Repeated images and what they evoke.",
        "Near-term vs longer-term horizon?",
      ];
    case "Apocalyptic":
      return [
        "Who is suffering/under pressure?",
        "What powers/oppression might be implied?",
        "Repeated symbols/numbers?",
        "Big contrasts (true/false worship)?",
        "What hope is offered to endure?",
        "How would first readers hear this imagery?",
      ];
    default:
      return [
        "Who wrote it? Who heard it first?",
        "What’s happening historically/culturally?",
        "Why was it written/spoken?",
        "Any repeated themes or key terms?",
        "Any OT/covenant background assumed?",
        "What would “land” emotionally for them?",
      ];
  }
}

const TOOLS_BY_CARD: Record<string, ToolLink[]> = {
  passageText: [
    { label: "NET API (plain text)", url: "https://labs.bible.org/api/?passage=John+3:16-17", tooltip: "Opens NET passage output (easy copy/paste)" },
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Find a passage + compare tools" },
    { label: "ESV Bible", url: "https://www.esv.org/", tooltip: "Clean passage text for copy/paste" },
    { label: "BibleGateway", url: "https://www.biblegateway.com/", tooltip: "Compare translations before pasting" },
  ],
  genre: [
    { label: "BibleGateway (Genres)", url: "https://www.biblegateway.com/learn/bible-101/about-the-bible/biblical-genres/", tooltip: "Genre overview + examples" },
    { label: "BibleProject (How to Read)", url: "https://bibleproject.com/videos/collections/how-to-read-the-bible/", tooltip: "Visual + conceptual, very accessible" },
  ],
  context: [
    { label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/", tooltip: "Background + structure" },
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Cross-refs + study tools" },
    { label: "Bible Odyssey", url: "https://www.bibleodyssey.org/", tooltip: "Cultural background" },
    { label: "NET Bible", url: "https://netbible.org/", tooltip: "Translator notes explain why wording matters" },
  ],
  obs: [
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Read in context + notes + cross-refs" },
    { label: "Blue Letter Bible", url: "https://www.blueletterbible.org/", tooltip: "Interlinear + key word lookups" },
    { label: "NET Bible", url: "https://netbible.org/", tooltip: "Translator notes explain why wording matters" },
    { label: "OpenBible (Cross-refs)", url: "https://www.openbible.info/labs/cross-references/", tooltip: "Visualizes textual connections" },
  ],
  aud: [
    { label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/", tooltip: "Audience + historical setting" },
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Notes + background tools" },
  ],
  mean: [
    { label: "BibleProject (Themes)", url: "https://bibleproject.com/explore/themes/", tooltip: "Explore themes" },
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Compare translations + notes" },
    { label: "Blue Letter Bible", url: "https://www.blueletterbible.org/", tooltip: "Check key terms (don’t overdo it)" },
  ],
  sim: [
    { label: "BibleProject (Themes)", url: "https://bibleproject.com/explore/themes/", tooltip: "Themes that carry over" },
    { label: "GotQuestions", url: "https://www.gotquestions.org/", tooltip: "Topic summary (compare carefully)" },
  ],
  diff: [
    { label: "BibleProject (Covenants)", url: "https://bibleproject.com/videos/covenants/", tooltip: "Covenant/storyline differences" },
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Cross-refs to clarify scope" },
  ],
  app: [{ label: "BibleProject (Character of God)", url: "https://bibleproject.com/videos/collections/character-of-god/", tooltip: "Keep application God-centered" }],
  notes: [{ label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Quick cross-refs to capture in notes" }],
  advStructure: [
    { label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/", tooltip: "Structure + flow overview" },
    { label: "NET Bible", url: "https://netbible.org/", tooltip: "Translator notes explain why wording matters" },
  ],
  advThemes: [
    { label: "BibleProject (Themes)", url: "https://bibleproject.com/explore/themes/", tooltip: "Themes across the book" },
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Theme tracing via cross-refs" },
  ],
  advCrossRefs: [
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Cross-refs + parallels" },
    { label: "TSK", url: "https://thetreasuryofscriptureknowledge.com/", tooltip: "Cross-ref density" },
  ],
  advWordStudy: [
    { label: "Blue Letter Bible", url: "https://www.blueletterbible.org/", tooltip: "Interlinear + lexicon" },
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Greek/Hebrew tools + cross-refs" },
  ],
  advCommentary: [
    { label: "BibleProject", url: "https://bibleproject.com/explore/book-overviews/", tooltip: "Big-picture check" },
    { label: "GotQuestions", url: "https://www.gotquestions.org/", tooltip: "Quick summary (compare carefully)" },
  ],
};

const GLOBAL_RESOURCES: Array<{ title: string; subtitle: string; url: string }> = [
  { title: "BibleProject — Book Overviews", subtitle: "Quick context + structure for every book.", url: "https://bibleproject.com/explore/book-overviews/" },
  { title: "ESV Bible", subtitle: "Clean passage text for copy/paste", url: "https://www.esv.org/" },
  { title: "NET Bible", subtitle: "Translator notes explain why wording matters", url: "https://netbible.org/" },
  { title: "StepBible — Free study tools", subtitle: "Cross references, lexicon, notes.", url: "https://www.stepbible.org/" },
  { title: "Blue Letter Bible — Interlinear + Lexicon", subtitle: "Word study, original language tools.", url: "https://www.blueletterbible.org/" },
  { title: "GotQuestions (use discernment)", subtitle: "Fast topic summaries; compare with Scripture.", url: "https://www.gotquestions.org/" },
];

function ToolsModal({ open, title, tools, onClose }: { open: boolean; title: string; tools: ToolLink[]; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold tracking-tight text-slate-900">{title}</div>
        <div className="mt-1 text-sm text-slate-600">Tap a tool to open it in your browser.</div>

        <div className="mt-4 space-y-2">
          {tools.length ? (
            tools.map((t) => (
              <a
                key={t.url}
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm hover:bg-slate-50"
              >
                <div>
                  <div className="font-semibold text-slate-900">{t.label}</div>
                  <div className="mt-0.5 text-xs text-slate-600">{t.tooltip}</div>
                </div>
                <div className="text-slate-400">↗</div>
              </a>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No tools linked for this step yet.</div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function trimOrEmpty(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function buildCopyText(metaLine: string, sections: Array<{ label: string; value: string }>) {
  const lines: string[] = [];
  lines.push("Session Summary");
  lines.push(metaLine);
  lines.push("");
  for (const s of sections) {
    lines.push(`${s.label}:`);
    lines.push(s.value);
    lines.push("");
  }
  return lines.join("\n");
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.top = "0";
    ta.style.left = "0";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function WinMomentModal({
  open,
  onClose,
  title,
  subtitle,
  metaLine,
  completionLabel,
  sections,
  backToViewerHref,
  backToStudyHref,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  metaLine: string;
  completionLabel: string;
  sections: Array<{ label: string; value: string }>;
  backToViewerHref: string;
  backToStudyHref: string;
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const copyText = buildCopyText(`${metaLine} • ${completionLabel}`, sections);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Session complete">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xl font-semibold tracking-tight text-slate-900">{title}</div>
            <div className="mt-1 text-sm text-slate-600">{subtitle}</div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{metaLine}</div>
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">{completionLabel}</div>
            </div>
          </div>

          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              const ok = await copyToClipboard(copyText);
              setCopied(ok);
              if (ok) setTimeout(() => setCopied(false), 1600);
            }}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Copy summary
          </button>

          {copied ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Copied.</div> : null}
        </div>

        <div className="mt-5 space-y-3">
          {sections.length ? (
            sections.map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{s.value}</div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No notes were added yet — you can keep editing, or jump back to the viewer.</div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <a href={backToStudyHref} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 text-center">
            Back to study
          </a>
          <a href={backToViewerHref} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 text-center">
            View session
          </a>
        </div>

        <div className="mt-4 text-xs text-slate-500">Tip: If you want to tweak anything, close this and keep editing — your work is already saved.</div>
      </div>
    </div>
  );
}

/* -------------------- Application Guardrails -------------------- */

const MIN_FILLED_CHARS = 30;

function isFilled(v: string) {
  return v.trim().length >= MIN_FILLED_CHARS;
}

function versePatternHit(s: string) {
  return /\b\d{1,3}:\d{1,3}\b/.test(s);
}

function connectorHit(s: string) {
  return /\b(because|therefore|so that|since|in light of|as a result)\b/i.test(s);
}

function quoteHit(s: string) {
  const m = s.match(/"([^"]{8,})"/) || s.match(/“([^”]{8,})”/);
  return !!m;
}

function anchoredStatus(app: string) {
  const a = app.trim();
  if (!a) return "none" as const;
  const ok = versePatternHit(a) || connectorHit(a) || quoteHit(a);
  if (ok) return "pass" as const;
  if (a.length >= 40) return "warn" as const;
  return "fail" as const;
}

function measurableStatus(app: string) {
  const a = app.trim();
  if (!a) return "none" as const;

  const timeMarker =
    /\b(today|tonight|tomorrow|this week|this month|by\b|before\b|daily\b|weekly\b|on (mon|tue|wed|thu|thur|fri|sat|sun)\b|\b\d+\s?(min|mins|minute|minutes|day|days|week|weeks)\b)/i.test(
      a
    );

  const concreteVerb =
    /\b(call|text|talk|apologize|forgive|pray|read|memorize|journal|fast|serve|share|confess|meet|invite|encourage|give|write|listen|visit)\b/i.test(
      a
    );

  if (timeMarker && concreteVerb) return "pass" as const;
  if (timeMarker || concreteVerb) return "warn" as const;
  return "fail" as const;
}

function godCenteredStatus(app: string) {
  const a = app.trim();
  if (!a) return "none" as const;

  const godWords = /\b(God|Jesus|Christ|Spirit|Holy Spirit|grace|gospel|prayer|obedience|faith)\b/i.test(a);
  const postureWords = /\b(repenten|repent|humble|humility|forgive|forgiveness|serve|worship)\b/i.test(a);

  const explicitlySelfOnly = /\b(manifest|be a better person)\b/i.test(a);

  if (explicitlySelfOnly) return "fail" as const;
  if (godWords || postureWords) return "pass" as const;
  return "warn" as const;
}

function statusPill(status: "ready" | "almost" | "not") {
  if (status === "ready") return { emoji: "✅", label: "Ready" };
  if (status === "almost") return { emoji: "🟡", label: "Almost" };
  return { emoji: "🔴", label: "Not ready" };
}

function AppTemplatesModal({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (templateText: string) => void }) {
  if (!open) return null;

  const templates: Array<{ title: string; body: string }> = [
    {
      title: "Therefore (simple)",
      body: `Because (verse/observation: ___),
I will (specific action: ___)
by (timeframe: ___).`,
    },
    {
      title: "Stop + Replace",
      body: `This week, I will stop ___
and replace it with ___
because ___ (text anchor).`,
    },
    {
      title: "Relationship / reconciliation",
      body: `By ___, I will reach out to ___
to ___ (apologize/encourage/forgive),
because ___ (text anchor).`,
    },
    {
      title: "Spiritual discipline",
      body: `For the next ___ (days/weeks),
I will ___ (pray/read/journal/memorize)
for ___ minutes on ___,
because ___ (text anchor).`,
    },
    {
      title: "Service",
      body: `By ___, I will serve ___ by ___
so that ___,
because ___ (text anchor).`,
    },
    {
      title: "Advanced: motive + measure + moment",
      body: `In response to ___ (text anchor),
I will ___ (measurable action) by ___,
starting with ___ (first step) today.`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label="Application templates">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold tracking-tight text-slate-900">Application templates</div>
        <div className="mt-1 text-sm text-slate-600">Pick one to insert into your Application response.</div>

        <div className="mt-4 grid gap-3">
          {templates.map((t) => (
            <button key={t.title} type="button" onClick={() => onPick(t.body)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50">
              <div className="text-sm font-semibold text-slate-900">{t.title}</div>
              <div className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{t.body}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- UI helpers -------------------- */

function CardShell({
  title,
  helper,
  children,
  toolsKey,
  onOpenTools,
  id,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
  toolsKey?: string;
  onOpenTools?: (key: string, title: string) => void;
  id?: string;
}) {
  return (
    <section id={id} className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold tracking-tight text-slate-900">{title}</div>
          {helper ? <div className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{helper}</div> : null}
        </div>

        {toolsKey && onOpenTools ? (
          <button
            type="button"
            onClick={() => onOpenTools(toolsKey, `Tools for ${title.replace(/^\d+\)\s*/, "")}`)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            title="Tools"
          >
            🛠️
          </button>
        ) : null}
      </div>

      <div className="mt-4">{children}</div>
    </section>
  );
}

function computeCompletionFromDefaults(track: StudyTrack, d: SessionEditorDefaults) {
  const baseKeys: Array<keyof SessionEditorDefaults> = ["obs", "app"];
  const midKeys: Array<keyof SessionEditorDefaults> = ["aud", "mean", "sim", "diff"];
  const advKeys: Array<keyof SessionEditorDefaults> = ["advStructure", "advThemes", "advCrossRefs", "advWordStudy", "advCommentary"];

  const keys: Array<keyof SessionEditorDefaults> =
    track === "beginner" ? baseKeys : track === "intermediate" ? [...baseKeys, ...midKeys] : [...baseKeys, ...midKeys, ...advKeys];

  const filled = keys.filter((k) => trimOrEmpty(d[k]).length > 0).length;
  const total = keys.length || 1;
  const pct = Math.max(0, Math.min(100, Math.round((filled / total) * 100)));
  return { filled, total, pct };
}

export function SessionEditorForm({ tenantLabel, saved, showWinMoment, winMomentId, backToViewerHref, backToStudyHref, defaults, action }: Props) {
  const [track, setTrack] = React.useState((defaults.track || "beginner") as StudyTrack);
  const [mode, setMode] = React.useState<"guided" | "free">(defaults.mode || "guided");

  const [genreSelected, setGenreSelected] = React.useState(normalizeGenreLabel(defaults.genre || "Unknown"));
  const [genreCustom, setGenreCustom] = React.useState("");

  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [toolsTitle, setToolsTitle] = React.useState("Tools");
  const [toolsKey, setToolsKey] = React.useState("");

  const [winOpen, setWinOpen] = React.useState(false);

  // Guardrails state
  const [passageTextValue, setPassageTextValue] = React.useState(defaults.passageText ?? "");
  const [obsValue, setObsValue] = React.useState(defaults.obs ?? "");
  const [audValue, setAudValue] = React.useState(defaults.aud ?? "");
  const [meanValue, setMeanValue] = React.useState(defaults.mean ?? "");
  const [simValue, setSimValue] = React.useState(defaults.sim ?? "");
  const [diffValue, setDiffValue] = React.useState(defaults.diff ?? "");
  const [appValue, setAppValue] = React.useState(defaults.app ?? "");

  const [appFocused, setAppFocused] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);

  // Missing-step cycling
  const [missingCycleIdx, setMissingCycleIdx] = React.useState(0);

  const showIntermediate = track === "intermediate" || track === "advanced";
  const showAdvanced = track === "advanced";

  const genreFinal = normalizeGenreLabel(genreCustom ? genreCustom : genreSelected);

  function openTools(key: string, title: string) {
    setToolsKey(key);
    setToolsTitle(title);
    setToolsOpen(true);
  }

  // OPEN ONLY ONCE: Win moment
  React.useEffect(() => {
    if (!showWinMoment) return;
    if (!winMomentId) {
      setWinOpen(true);
      return;
    }
    try {
      const storageKey = `bsh_winmoment_seen:${winMomentId}`;
      const already = sessionStorage.getItem(storageKey) === "1";
      if (!already) {
        sessionStorage.setItem(storageKey, "1");
        setWinOpen(true);
      }
    } catch {
      setWinOpen(true);
    }
  }, [showWinMoment, winMomentId]);

  const obsTitle = copyObsTitle(track);
  const obsHelper = copyObsHelper(track);
  const obsHint = copyObsHint(track, genreFinal);

  const appTitle = showIntermediate ? "6) Application / response" : "2) Application / response";
  const appHelper = copyAppHelper(track);
  const appHint = copyAppHint(track);

  const checklist = contextChecklist(genreFinal);

  const statusDefault: "draft" | "complete" = defaults.status === "complete" ? "complete" : "draft";

  const winSections: Array<{ label: string; value: string }> = React.useMemo(() => {
    const sections: Array<{ label: string; value: string }> = [];

    const passageText = trimOrEmpty(passageTextValue);
    if (passageText) sections.push({ label: "Passage text", value: passageText });

    const obs = trimOrEmpty(obsValue);
    if (obs) sections.push({ label: "Observations", value: obs });

    if (showIntermediate) {
      const aud = trimOrEmpty(audValue);
      if (aud) sections.push({ label: "Original audience", value: aud });

      const mean = trimOrEmpty(meanValue);
      if (mean) sections.push({ label: "Meaning (then)", value: mean });

      const sim = trimOrEmpty(simValue);
      if (sim) sections.push({ label: "Similarities (bridge)", value: sim });

      const diff = trimOrEmpty(diffValue);
      if (diff) sections.push({ label: "Differences (guardrails)", value: diff });
    }

    const app = trimOrEmpty(appValue);
    if (app) sections.push({ label: "Application / response", value: app });

    if (showAdvanced) {
      const advStructure = trimOrEmpty(defaults.advStructure);
      if (advStructure) sections.push({ label: "Advanced — Structure / flow", value: advStructure });

      const advThemes = trimOrEmpty(defaults.advThemes);
      if (advThemes) sections.push({ label: "Advanced — Themes", value: advThemes });

      const advCrossRefs = trimOrEmpty(defaults.advCrossRefs);
      if (advCrossRefs) sections.push({ label: "Advanced — Cross references", value: advCrossRefs });

      const advWordStudy = trimOrEmpty(defaults.advWordStudy);
      if (advWordStudy) sections.push({ label: "Advanced — Word study", value: advWordStudy });

      const advCommentary = trimOrEmpty(defaults.advCommentary);
      if (advCommentary) sections.push({ label: "Advanced — Commentary / questions", value: advCommentary });
    }

    const notes = trimOrEmpty(defaults.notes);
    if (notes) sections.push({ label: "Notes", value: notes });

    return sections;
  }, [
    passageTextValue,
    obsValue,
    audValue,
    meanValue,
    simValue,
    diffValue,
    appValue,
    defaults.advStructure,
    defaults.advThemes,
    defaults.advCrossRefs,
    defaults.advWordStudy,
    defaults.advCommentary,
    defaults.notes,
    showIntermediate,
    showAdvanced,
  ]);

  const toolsForModal = TOOLS_BY_CARD[toolsKey] ?? [];

  const metaLine = `Track: ${trackLabel(track)} • Mode: ${mode} • Genre: ${genreFinal === "Unknown" ? "General" : genreFinal}`;

  const completion = React.useMemo(() => computeCompletionFromDefaults(track, defaults), [track, defaults]);
  const completionLabel = `Completion: ${completion.pct}% (${completion.filled}/${completion.total})`;

  /* -------------------- Guardrails calculations -------------------- */

  const prereqValues: Record<string, string> = {
    obs: obsValue,
    aud: audValue,
    mean: meanValue,
    sim: simValue,
    diff: diffValue,
  };

  const prereqTotal = track === "beginner" ? 1 : 5;

  const prereqFilledCount = React.useMemo(() => {
    if (track === "beginner") return isFilled(obsValue) ? 1 : 0;
    let c = 0;
    if (isFilled(obsValue)) c += 1;
    if (isFilled(audValue)) c += 1;
    if (isFilled(meanValue)) c += 1;
    if (isFilled(simValue)) c += 1;
    if (isFilled(diffValue)) c += 1;
    return c;
  }, [track, obsValue, audValue, meanValue, simValue, diffValue]);

  const readiness = React.useMemo(() => {
    if (track === "beginner") {
      if (isFilled(obsValue)) return "ready" as const;
      if (!isFilled(obsValue) && isFilled(passageTextValue)) return "almost" as const;
      return "not" as const;
    }
    if (prereqFilledCount >= prereqTotal) return "ready" as const;
    if (prereqFilledCount === prereqTotal - 1) return "almost" as const;
    return "not" as const;
  }, [track, obsValue, passageTextValue, prereqFilledCount, prereqTotal]);

  const readinessPct = React.useMemo(() => {
    if (track === "beginner") {
      if (isFilled(obsValue)) return 100;
      if (isFilled(passageTextValue)) return 50;
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round((prereqFilledCount / prereqTotal) * 100)));
  }, [track, obsValue, passageTextValue, prereqFilledCount, prereqTotal]);

  // Missing list (labels)
  const missingList = React.useMemo(() => {
    if (track === "beginner") {
      if (isFilled(obsValue)) return [] as string[];
      return ["Observation"] as string[];
    }
    const order: Array<{ key: string; label: string }> = [
      { key: "obs", label: "Observation" },
      { key: "aud", label: "Audience" },
      { key: "mean", label: "Meaning" },
      { key: "sim", label: "Similarities" },
      { key: "diff", label: "Differences" },
    ];
    const missing: string[] = [];
    for (const item of order) {
      if (!isFilled(prereqValues[item.key])) missing.push(item.label);
    }
    return missing;
  }, [track, obsValue, prereqValues]);

  // Missing list (ids) for cycling
  const missingIds = React.useMemo(() => {
    if (track === "beginner") {
      if (isFilled(obsValue)) return [] as string[];
      return ["card-obs"];
    }
    const order: Array<{ key: string; id: string }> = [
      { key: "obs", id: "card-obs" },
      { key: "aud", id: "card-aud" },
      { key: "mean", id: "card-mean" },
      { key: "sim", id: "card-sim" },
      { key: "diff", id: "card-diff" },
    ];
    const out: string[] = [];
    for (const item of order) {
      if (!isFilled(prereqValues[item.key])) out.push(item.id);
    }
    return out;
  }, [track, obsValue, prereqValues]);

  // reset cycling when missing steps change
  React.useEffect(() => {
    setMissingCycleIdx(0);
  }, [missingIds.join("|")]);

  function scrollToMissingCycle() {
    if (!missingIds.length) {
      document.getElementById("card-app")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const idx = Math.max(0, missingCycleIdx) % missingIds.length;
    const id = missingIds[idx];
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMissingCycleIdx((v) => v + 1);
  }

  const showCoach = appFocused || readiness !== "ready";

  const aStatus = anchoredStatus(appValue);
  const mStatus = measurableStatus(appValue);
  const gStatus = godCenteredStatus(appValue);

  function badgeFor(s: "pass" | "warn" | "fail" | "none") {
    if (s === "pass") return { emoji: "✅", tone: "text-emerald-800", bg: "bg-emerald-50 border-emerald-200" };
    if (s === "warn") return { emoji: "🟡", tone: "text-amber-800", bg: "bg-amber-50 border-amber-200" };
    if (s === "fail") return { emoji: "🔴", tone: "text-rose-800", bg: "bg-rose-50 border-rose-200" };
    return { emoji: "•", tone: "text-slate-700", bg: "bg-slate-50 border-slate-200" };
  }

  function insertTemplate(t: string) {
    const cur = appValue.trimEnd();
    const next = cur.length ? `${cur}\n\n---\n\n${t}` : t;
    setAppValue(next);
    setTemplatesOpen(false);
    document.getElementById("app-textarea")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const el = document.getElementById("app-textarea") as HTMLTextAreaElement | null;
      el?.focus();
      if (el) el.selectionStart = el.selectionEnd = el.value.length;
    }, 50);
  }

  // Auto-suggest templates ONCE (per session edit lifecycle) when user focuses Application while Not ready.
  const templatesSuggestKey = React.useMemo(() => {
    // Prefer winMomentId if available; otherwise use a stable key for this session/page context.
    const base = winMomentId ? `win:${winMomentId}` : `meta:${tenantLabel}|${defaults.session_date}|${defaults.passage}`;
    return `bsh_app_templates_suggested:${base}`;
  }, [winMomentId, tenantLabel, defaults.session_date, defaults.passage]);

  function maybeAutoSuggestTemplates() {
    if (readiness !== "not") return;
    try {
      const already = sessionStorage.getItem(templatesSuggestKey) === "1";
      if (already) return;
      sessionStorage.setItem(templatesSuggestKey, "1");
      setTemplatesOpen(true);
    } catch {
      // if storage blocked, still show once per render intent (best effort)
      setTemplatesOpen(true);
    }
  }

  const { emoji: readinessEmoji, label: readinessLabel } = statusPill(readiness);

  return (
    <>
      <ToolsModal open={toolsOpen} title={toolsTitle} tools={toolsForModal} onClose={() => setToolsOpen(false)} />
      <AppTemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} onPick={insertTemplate} />

      <WinMomentModal
        open={winOpen}
        onClose={() => setWinOpen(false)}
        title="Session complete 🎉"
        subtitle="Here’s a quick summary of what you captured."
        metaLine={metaLine}
        completionLabel={completionLabel}
        sections={winSections}
        backToViewerHref={backToViewerHref}
        backToStudyHref={backToStudyHref}
      />

      <form action={action} className="mx-auto max-w-3xl px-4 pb-16 pt-8">
        <div className="text-sm font-semibold text-slate-700">Bible Study • {tenantLabel}</div>

        <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{defaults.passage ? defaults.passage : "Study session"}</div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <div>
            Track: <span className="font-semibold text-slate-800">{trackLabel(track)}</span>
          </div>
          <div>
            Mode: <span className="font-semibold text-slate-800">{mode}</span>
          </div>
          <div>
            Genre: <span className="font-semibold text-slate-800">{genreFinal === "Unknown" ? "General" : genreFinal}</span>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{trackSummary(track)}</div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a href={backToStudyHref} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Back to study
          </a>

          <a href={backToViewerHref} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            Back to viewer
          </a>

          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
            Save
          </button>

          {saved ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Saved.</div> : null}
        </div>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-base font-semibold tracking-tight text-slate-900">Passage reference</div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-semibold text-slate-800">Passage reference</div>
              <input
                name="passage"
                defaultValue={defaults.passage}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                placeholder="e.g., John 15:1–17"
              />
            </label>

            <label className="block">
              <div className="text-sm font-semibold text-slate-800">Session date</div>
              <input name="session_date" type="datetime-local" defaultValue={defaults.session_date} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" />
            </label>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-semibold text-slate-800">Track</div>
              <select value={track} onChange={(e) => setTrack((e.target.value as StudyTrack) || "beginner")} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </label>

            <label className="block">
              <div className="text-sm font-semibold text-slate-800">Mode</div>
              <select value={mode} onChange={(e) => setMode((e.target.value as "guided" | "free") || "guided")} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300">
                <option value="guided">guided</option>
                <option value="free">free</option>
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="text-sm font-semibold text-slate-800">Status</div>
              <select name="status" defaultValue={statusDefault} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300">
                <option value="draft">draft</option>
                <option value="complete">complete</option>
              </select>
            </label>

            <div className="block">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-800">Genre</div>
                <button type="button" onClick={() => openTools("genre", "Tools for Genre")} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50" title="Tools">
                  🛠️
                </button>
              </div>

              <select value={genreSelected} onChange={(e) => setGenreSelected(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300">
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <input value={genreCustom} onChange={(e) => setGenreCustom(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="Custom genre (optional)" />

              <div className="mt-2 text-xs text-slate-600">Genre lens: {genreFinal === "Unknown" ? "Use general prompts." : "Genre shapes what to look for."}</div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-base font-semibold tracking-tight text-slate-900">Free resources (all)</div>
          <div className="mt-1 text-sm text-slate-600">Global list of tools you can reference anytime.</div>

          <div className="mt-4 grid gap-3">
            {GLOBAL_RESOURCES.map((r) => (
              <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm hover:bg-slate-50">
                <div className="font-semibold text-slate-900">{r.title}</div>
                <div className="mt-0.5 text-xs text-slate-600">{r.subtitle}</div>
              </a>
            ))}
          </div>
        </section>

        <CardShell title="Genre lens + passage text" helper="Tip: Use the 🛠️ Tools button for genre references without leaving this step." toolsKey="passageText" onOpenTools={openTools}>
          <div className="text-sm text-slate-700">{genreFinal === "Unknown" ? "If you’re not sure, keep it as Unknown and start with the general prompts." : `Selected genre: ${genreFinal}`}</div>
          <div className="mt-2 text-xs text-slate-600">Tip: If you paste full text, you’ll spot repeated terms and structure more easily.</div>

          <textarea
            name="passageText"
            value={passageTextValue}
            onChange={(e) => setPassageTextValue(e.target.value)}
            className="mt-4 min-h-[200px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
            placeholder="Paste the passage text here (optional but helpful)."
          />
        </CardShell>

        {showIntermediate ? (
          <CardShell title="Historical / cultural context (Intermediate)" helper="Answer “Who/why/what was happening?” so application stays accurate." toolsKey="context" onOpenTools={openTools}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Quick checklist ({genreFinal === "Unknown" ? "General" : genreFinal})</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">{checklist.slice(0, 3).map((c) => <li key={c}>{c}</li>)}</ul>
              <div className="mt-3 text-xs text-slate-600">Templates live in the Audience / Meaning boxes below (open those cards and start with simple bullets).</div>
            </div>
          </CardShell>
        ) : null}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-base font-semibold tracking-tight text-slate-900">Guided study prompts</div>
          <div className="mt-1 text-sm text-slate-600">Work top to bottom. Keep it text-based before interpreting.</div>
        </section>

        <CardShell id="card-obs" title={obsTitle} helper={obsHelper} toolsKey="obs" onOpenTools={openTools}>
          <textarea
            name="obs"
            value={obsValue}
            onChange={(e) => setObsValue(e.target.value)}
            className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
            placeholder={obsHint}
          />
        </CardShell>

        {showIntermediate ? (
          <>
            <CardShell id="card-aud" title="2) Original audience" helper="Who heard/read this first? What was their situation?" toolsKey="aud" onOpenTools={openTools}>
              <textarea name="aud" value={audValue} onChange={(e) => setAudValue(e.target.value)} className="min-h-[150px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="Audience, setting, pressures, cultural background…" />
            </CardShell>

            <CardShell id="card-mean" title="3) What did it mean to them?" helper="What would the original audience understand this to mean in THEIR world?" toolsKey="mean" onOpenTools={openTools}>
              <textarea name="mean" value={meanValue} onChange={(e) => setMeanValue(e.target.value)} className="min-h-[150px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="Meaning to them, why it mattered, assumptions they already had…" />
            </CardShell>

            <CardShell id="card-sim" title="4) How is our context similar?" helper="Bridge: what overlaps between their world and ours?" toolsKey="sim" onOpenTools={openTools}>
              <textarea name="sim" value={simValue} onChange={(e) => setSimValue(e.target.value)} className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="Similarities (faith, struggles, community, temptations)…" />
            </CardShell>

            <CardShell id="card-diff" title="5) How is our context different?" helper="Guardrail: name differences so you don’t misapply." toolsKey="diff" onOpenTools={openTools}>
              <textarea name="diff" value={diffValue} onChange={(e) => setDiffValue(e.target.value)} className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="Differences (covenant, culture, setting, audience)…" />
            </CardShell>
          </>
        ) : null}

        {/* -------------------- Application Readiness Band -------------------- */}
        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-base font-semibold tracking-tight text-slate-900">Application readiness</div>
              <div className="mt-1 text-sm text-slate-600">
                {readiness === "ready"
                  ? "You’re set up for a text-anchored application."
                  : readiness === "almost"
                    ? "You’re close. Fill the missing step(s) to keep application accurate."
                    : "You can write application now, but it’s better after the bridge steps are filled."}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                {readinessEmoji} {readinessLabel}
              </div>

              <button type="button" onClick={scrollToMissingCycle} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                Jump to missing step
              </button>

              <button type="button" onClick={() => setTemplatesOpen(true)} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Insert template
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <div>Readiness: {readinessPct}%</div>
              <div className="text-slate-500">{track === "beginner" ? (isFilled(obsValue) ? "(1/1)" : "(0/1)") : `(${prereqFilledCount}/${prereqTotal})`}</div>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-slate-900" style={{ width: `${readinessPct}%` }} />
            </div>

            {missingList.length ? (
              <div className="mt-3 text-sm text-slate-700">
                <span className="font-semibold">Missing:</span> {missingList.join(", ")}
              </div>
            ) : null}
          </div>
        </section>

        <CardShell id="card-app" title={appTitle} helper={appHelper} toolsKey="app" onOpenTools={openTools}>
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-slate-700">
              {readiness === "not" ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  <div className="font-semibold">Guardrails:</div>
                  <div className="mt-1">You can save anytime — but application gets much stronger after Audience + Meaning + Similar/Different are filled.</div>
                </div>
              ) : readiness === "almost" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-semibold">Almost ready:</div>
                  <div className="mt-1">Fill the missing bridge step so your application stays accurate.</div>
                </div>
              ) : null}
            </div>

            <button type="button" onClick={() => setTemplatesOpen(true)} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Templates
            </button>
          </div>

          {showCoach ? (
            <div className="mt-4 grid gap-3">
              {(() => {
                const b = badgeFor(aStatus);
                return (
                  <div className={`rounded-2xl border ${b.bg} p-4`}>
                    <div className={`text-sm font-semibold ${b.tone}`}>{b.emoji} Anchored to the text</div>
                    <div className="mt-1 text-sm text-slate-700">
                      {aStatus === "pass"
                        ? "Text anchor looks good."
                        : aStatus === "warn"
                          ? "Try anchoring: add a verse reference or a “because/therefore” connection."
                          : aStatus === "fail"
                            ? "This reads unanchored. Add a verse reference or tie it to an observation."
                            : "Write your response, then we’ll check if it’s anchored."}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const b = badgeFor(mStatus);
                return (
                  <div className={`rounded-2xl border ${b.bg} p-4`}>
                    <div className={`text-sm font-semibold ${b.tone}`}>{b.emoji} Specific + measurable</div>
                    <div className="mt-1 text-sm text-slate-700">
                      {mStatus === "pass"
                        ? "Specific and measurable."
                        : mStatus === "warn"
                          ? "Add a timeframe or a concrete action (who/what/when)."
                          : mStatus === "fail"
                            ? "This is vague. Use a template to make it actionable."
                            : "Aim for a concrete action + timeframe."}
                    </div>
                  </div>
                );
              })()}

              {(() => {
                const b = badgeFor(gStatus);
                return (
                  <div className={`rounded-2xl border ${b.bg} p-4`}>
                    <div className={`text-sm font-semibold ${b.tone}`}>{b.emoji} God-centered motive</div>
                    <div className="mt-1 text-sm text-slate-700">
                      {gStatus === "pass"
                        ? "Tone is God-centered."
                        : gStatus === "warn"
                          ? "Consider adding motive: “because God…” “in response to…”"
                          : gStatus === "fail"
                            ? "This reads self-centered. Reframe as response to what God has done/said."
                            : "Consider adding a motive tied to the passage."}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}

          <textarea
            id="app-textarea"
            name="app"
            value={appValue}
            onChange={(e) => setAppValue(e.target.value)}
            onFocus={() => {
              setAppFocused(true);
              maybeAutoSuggestTemplates();
            }}
            onBlur={() => setAppFocused(false)}
            className="mt-4 min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
            placeholder={appHint}
          />
        </CardShell>

        {showAdvanced ? (
          <>
            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-base font-semibold tracking-tight text-slate-900">Advanced study</div>
              <div className="mt-1 text-sm text-slate-600">Optional deep-dive prompts for structure, themes, and cross-references.</div>
            </section>

            <CardShell title="A) Structure / argument flow" helper="Outline the logic or movement of the passage (claims → reasons → implications)." toolsKey="advStructure" onOpenTools={openTools}>
              <textarea name="advStructure" defaultValue={defaults.advStructure} className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="Example: vv1–2 claim, vv3–5 reasons, vv6–8 application…" />
            </CardShell>

            <CardShell title="B) Big theological themes" helper="What truths about God, humanity, salvation, covenant, kingdom, holiness, etc.\nshow up here?" toolsKey="advThemes" onOpenTools={openTools}>
              <textarea name="advThemes" defaultValue={defaults.advThemes} className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="List 2–5 themes and point to the verse(s) that show them." />
            </CardShell>

            <CardShell title="C) Cross references / intertext" helper="Where does Scripture interpret Scripture? Note OT echoes, quotations, or parallel passages." toolsKey="advCrossRefs" onOpenTools={openTools}>
              <textarea name="advCrossRefs" defaultValue={defaults.advCrossRefs} className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="Write references and what connection you see (theme/phrase/concept)." />
            </CardShell>

            <CardShell title="D) Word study (key terms)" helper="Choose 1–3 key words.\nDefine them from context, then check lexicon/interlinear." toolsKey="advWordStudy" onOpenTools={openTools}>
              <textarea name="advWordStudy" defaultValue={defaults.advWordStudy} className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="Word → meaning in context → other uses → how it impacts interpretation." />
            </CardShell>

            <CardShell title="E) Commentary / questions to resolve" helper="Summarize what you found from a trusted resource and list any remaining questions." toolsKey="advCommentary" onOpenTools={openTools}>
              <textarea name="advCommentary" defaultValue={defaults.advCommentary} className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="What did you learn? What are 1–3 questions you still need to resolve?" />
            </CardShell>
          </>
        ) : null}

        <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-base font-semibold tracking-tight text-slate-900">Notes</div>
          <div className="mt-1 text-sm text-slate-600">Capture extra insights, questions, and prayer notes.</div>
        </section>

        <CardShell title="Additional notes (optional)" helper="Extra notes, cross references, prayer notes, questions…" toolsKey="notes" onOpenTools={openTools}>
          <textarea name="notes" defaultValue={defaults.notes} className="min-h-[200px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300" placeholder="Write anything helpful here…" />
        </CardShell>

        <input type="hidden" name="track" value={track} readOnly />
        <input type="hidden" name="mode" value={mode} readOnly />
        <input type="hidden" name="genre" value={genreSelected} readOnly />
        <input type="hidden" name="genre_custom" value={genreCustom} readOnly />
      </form>
    </>
  );
}
