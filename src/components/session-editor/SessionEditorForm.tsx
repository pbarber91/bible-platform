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

type ToolLink = { label: string; url: string; tooltip: string };

type Props = {
  tenantLabel: string;
  saved?: boolean;
  showWinMoment?: boolean;
  winMomentId?: string;
  backToViewerHref: string;
  backToStudyHref: string;
  defaults: SessionEditorDefaults;
  action: (formData: FormData) => void;

  /** Server action passed from the page (preferred over client-side fetch). */
  netFetchPlainTextAction?: (passage: string) => Promise<string>;

  /** Legacy prop (no longer used for inline notes; kept for compatibility). */
  netFetchNotesAction?: (passage: string) => Promise<string>;

  /** Cross-reference search (API.Bible /search). Runs only when the user clicks. */
  apiBibleSearchAction?: (query: string) => Promise<{
    query: string;
    total: number;
    verses: Array<{ reference: string; text: string }>;
    citation?: string;
  }>;
};

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
        "Any repeated phrases/images?",
        "Near-term vs far-term horizon?",
        "How would the original hearers respond?",
      ];
    case "Apocalyptic":
      return [
        "Symbols: what might they represent?",
        "Repeated images/number patterns?",
        "What contrast is being made (beast vs Lamb, etc.)?",
        "What would encourage the persecuted church?",
        "OT echoes behind the imagery?",
        "What is the main call to faithfulness?",
      ];
    default:
      return [
        "Who is speaking? To whom?",
        "What is the setting / situation?",
        "What key words repeat?",
        "What assumptions are in the background?",
        "What is the main point?",
        "What would the first audience hear?",
      ];
  }
}

function trimOrEmpty(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function Pill({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition",
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
      ].join(" ")}
      aria-pressed={active ? "true" : "false"}
    >
      {label}
    </button>
  );
}

function InlineHelp({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{children}</div>
    </div>
  );
}

function ToolsPanel({
  open,
  title,
  tools,
  onClose,
}: {
  open: boolean;
  title: string;
  tools: ToolLink[];
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold tracking-tight text-slate-900">{title}</div>
            <div className="mt-1 text-sm text-slate-600">
              Quick links to help you think clearly and stay text-first.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tools.map((t) => (
            <a
              key={t.url}
              href={t.url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded-2xl border border-slate-200 bg-white p-4 text-sm hover:bg-slate-50"
              title={t.tooltip}
            >
              <div className="font-semibold text-slate-900">{t.label}</div>
              <div className="mt-1 text-xs text-slate-600">{t.tooltip}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function WinMomentModal({
  open,
  onClose,
  tenantLabel,
  passage,
  dateLabel,
  completion,
  sections,
  backToViewerHref,
  backToStudyHref,
}: {
  open: boolean;
  onClose: () => void;
  tenantLabel: string;
  passage: string;
  dateLabel: string;
  completion: { filled: number; total: number; pct: number };
  sections: Array<{ label: string; value: string }>;
  backToViewerHref: string;
  backToStudyHref: string;
}) {
  if (!open) return null;

  const pct = completion.pct;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold tracking-tight text-slate-900">Session complete 🎉</div>
            <div className="mt-1 text-sm text-slate-600">
              Here’s a quick summary you can copy/share. (Nothing is locked — you can still edit.)
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">Header</div>
          <div className="mt-2 text-sm text-slate-700">
            <div>
              <span className="font-semibold">Type:</span> {tenantLabel}
            </div>
            <div>
              <span className="font-semibold">Passage:</span> {passage || "(none)"}
            </div>
            <div>
              <span className="font-semibold">Date:</span> {dateLabel}
            </div>
            <div>
              <span className="font-semibold">Completion:</span> {pct}% ({completion.filled}/{completion.total})
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {sections.map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">{s.label}</div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <a
              href={backToViewerHref}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Back to Session
            </a>
            <a
              href={backToStudyHref}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Back to Studies
            </a>
          </div>

          <div className="text-xs text-slate-500">
            Tip: If you want to tweak anything, close this and keep editing — your work is already saved.
          </div>
        </div>
      </div>
    </div>
  );
}

function CardShell({
  title,
  helper,
  children,
  toolsKey,
  onOpenTools,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
  toolsKey?: string;
  onOpenTools?: (key: string, title: string) => void;
}) {
  return (
    <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
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
  const advKeys: Array<keyof SessionEditorDefaults> = [
    "advStructure",
    "advThemes",
    "advCrossRefs",
    "advWordStudy",
    "advCommentary",
  ];

  const keys: Array<keyof SessionEditorDefaults> =
    track === "beginner"
      ? baseKeys
      : track === "intermediate"
      ? [...baseKeys, ...midKeys]
      : [...baseKeys, ...midKeys, ...advKeys];

  const filled = keys.filter((k) => trimOrEmpty(d[k]).length > 0).length;
  const total = keys.length || 1;
  const pct = Math.max(0, Math.min(100, Math.round((filled / total) * 100)));
  return { filled, total, pct };
}

export function SessionEditorForm({
  tenantLabel,
  saved,
  showWinMoment,
  winMomentId,
  backToViewerHref,
  backToStudyHref,
  defaults,
  action,
  netFetchPlainTextAction,
  apiBibleSearchAction,
}: Props) {
  const [track, setTrack] = React.useState((defaults.track || "beginner") as StudyTrack);
  const [mode, setMode] = React.useState<"guided" | "free">(defaults.mode || "guided");
  const [genreSelected, setGenreSelected] = React.useState(normalizeGenreLabel(defaults.genre || "Unknown"));
  const [genreCustom, setGenreCustom] = React.useState("");

  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [toolsTitle, setToolsTitle] = React.useState("Tools");
  const [toolsKey, setToolsKey] = React.useState("");

  const [winOpen, setWinOpen] = React.useState(false);

  const formRef = React.useRef<HTMLFormElement | null>(null);
  const passageTextRef = React.useRef<HTMLTextAreaElement | null>(null);
  const advCrossRefsRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [netLoading, startNetTransition] = React.useTransition();
  const [netError, setNetError] = React.useState<string | null>(null);
  const [netLastFetched, setNetLastFetched] = React.useState<string | null>(null);

  const [xrefLoading, startXrefTransition] = React.useTransition();
  const [xrefError, setXrefError] = React.useState<string | null>(null);
  const [xrefKeyword, setXrefKeyword] = React.useState("");
  const [xrefResults, setXrefResults] = React.useState<Array<{ reference: string; text: string }> | null>(
    null
  );
  const [xrefCitation, setXrefCitation] = React.useState<string | null>(null);
  const [xrefResultQuery, setXrefResultQuery] = React.useState<string | null>(null);

  const showIntermediate = track === "intermediate" || track === "advanced";
  const showAdvanced = track === "advanced";
  const genreFinal = normalizeGenreLabel(genreCustom ? genreCustom : genreSelected);

  function openTools(key: string, title: string) {
    setToolsKey(key);
    setToolsTitle(title);
    setToolsOpen(true);
  }

  function getPassageRef(): string {
    const el =
      ((formRef.current?.elements.namedItem("passage") as HTMLInputElement | null) ?? null);
    return (el?.value ?? defaults.passage ?? "").trim();
  }

  function buildNetViewerHref(passage: string): string {
    const clean = (passage || "").trim();
    if (!clean) return "https://netbible.org/";
    const plus = clean.replace(/\s+/g, "+");
    return `https://net.bible.org/#!bible/${plus}`;
  }

  // NEW (Option 1): open notes on NETBible.org (notes are not exposed via Labs API)
  function openNetNotesInNewTab() {
    const passage = getPassageRef();
    const url = buildNetViewerHref(passage);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleFetchNet() {
    setNetError(null);
    const passage = getPassageRef();
    if (!passage) {
      setNetError("Add a passage reference first (e.g., John 3:16-17).");
      return;
    }
    if (!netFetchPlainTextAction) {
      setNetError("NET fetch action is not configured on this page.");
      return;
    }

    startNetTransition(async () => {
      try {
        const text = await netFetchPlainTextAction(passage);
        if (passageTextRef.current) passageTextRef.current.value = text || "";
        setNetLastFetched(passage);
      } catch (e: any) {
        setNetError(e?.message ? String(e.message) : "Failed to fetch text.");
      }
    });
  }

  function appendCrossRef(ref: string) {
    const clean = (ref || "").trim();
    if (!clean) return;
    if (!advCrossRefsRef.current) return;

    const existing = advCrossRefsRef.current.value || "";
    const line = clean.startsWith("- ") ? clean : `- ${clean}`;
    const next = existing.trim()
      ? `${existing.trim()}
${line}
`
      : `${line}
`;
    advCrossRefsRef.current.value = next;
  }

  function handleCrossRefSearch() {
    setXrefError(null);
    setXrefResults(null);
    setXrefCitation(null);
    setXrefResultQuery(null);

    const kw = (xrefKeyword || "").trim();

    if (!kw) {
      setXrefError("Enter at least one keyword to search (e.g., love, faith, covenant).");
      return;
    }
    if (!apiBibleSearchAction) {
      setXrefError("Cross-ref search action is not configured on this page.");
      return;
    }

    // IMPORTANT:
    // API.Bible /search matches ALL keywords provided. Passage references like "John 3:16"
    // will NOT exist inside verse text, so including the passage string will produce zero results.
    // We therefore search by keywords ONLY.
    const query = kw;

    startXrefTransition(async () => {
      try {
        const r = await apiBibleSearchAction(query);
        const verses = Array.isArray(r?.verses) ? r.verses : [];
        setXrefResults(verses);
        setXrefCitation(typeof r?.citation === "string" ? r.citation : null);
        setXrefResultQuery(typeof r?.query === "string" ? r.query : query);
        if (!verses.length) {
          setXrefError("No results returned for that search. Try different keywords.");
        }
      } catch (e: any) {
        setXrefError(e?.message ? String(e.message) : "Cross-ref search failed.");
      }
    });
  }

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

    const passageText = trimOrEmpty(defaults.passageText);
    if (passageText) sections.push({ label: "Passage text", value: passageText });

    const obs = trimOrEmpty(defaults.obs);
    if (obs) sections.push({ label: "Observations", value: obs });

    if (showIntermediate) {
      const aud = trimOrEmpty(defaults.aud);
      if (aud) sections.push({ label: "Original audience", value: aud });

      const mean = trimOrEmpty(defaults.mean);
      if (mean) sections.push({ label: "Meaning (then)", value: mean });

      const sim = trimOrEmpty(defaults.sim);
      if (sim) sections.push({ label: "Similarities (bridge)", value: sim });

      const diff = trimOrEmpty(defaults.diff);
      if (diff) sections.push({ label: "Differences (guardrails)", value: diff });
    }

    const app = trimOrEmpty(defaults.app);
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
    defaults.passageText,
    defaults.obs,
    defaults.aud,
    defaults.mean,
    defaults.sim,
    defaults.diff,
    defaults.app,
    defaults.advStructure,
    defaults.advThemes,
    defaults.advCrossRefs,
    defaults.advWordStudy,
    defaults.advCommentary,
    defaults.notes,
    showIntermediate,
    showAdvanced,
  ]);

  const completion = React.useMemo(() => computeCompletionFromDefaults(track, defaults), [track, defaults]);

  const dateLabel = React.useMemo(() => {
    const iso = (defaults.session_date || "").trim();
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }, [defaults.session_date]);

  const toolbarTitle = React.useMemo(() => {
    if (toolsKey === "obs") return "Tools for Observations";
    if (toolsKey === "aud") return "Tools for Audience";
    if (toolsKey === "mean") return "Tools for Meaning";
    if (toolsKey === "sim") return "Tools for Similarities";
    if (toolsKey === "diff") return "Tools for Differences";
    if (toolsKey === "app") return "Tools for Application";
    if (toolsKey === "notes") return "Tools for Notes";
    if (toolsKey === "advStructure") return "Tools for Structure";
    if (toolsKey === "advThemes") return "Tools for Themes";
    if (toolsKey === "advCrossRefs") return "Tools for Cross references";
    if (toolsKey === "advWordStudy") return "Tools for Word study";
    if (toolsKey === "advCommentary") return "Tools for Commentary";
    return toolsTitle;
  }, [toolsKey, toolsTitle]);

  const toolLinks: ToolLink[] = React.useMemo(() => {
    const passage = getPassageRef();

    const baseTools: ToolLink[] = [
      {
        label: "NET Bible (online)",
        url: buildNetViewerHref(passage),
        tooltip: "View the passage on NETBible.org (notes + translator notes).",
      },
      {
        label: "BibleGateway",
        url: passage
          ? `https://www.biblegateway.com/passage/?search=${encodeURIComponent(passage)}`
          : "https://www.biblegateway.com/",
        tooltip: "Compare translations quickly.",
      },
      {
        label: "Blue Letter Bible",
        url: passage
          ? `https://www.blueletterbible.org/search/search.cfm?Criteria=${encodeURIComponent(
              passage
            )}&t=KJV#s=s_primary_0_1`
          : "https://www.blueletterbible.org/",
        tooltip: "Interlinear + lexicons + cross references.",
      },
      {
        label: "StepBible",
        url: passage ? `https://www.stepbible.org/?q=reference=${encodeURIComponent(passage)}` : "https://www.stepbible.org/",
        tooltip: "Word-level study and linked resources.",
      },
    ];

    const sectionTools: Record<string, ToolLink[]> = {
      obs: [
        {
          label: "Observation checklist",
          url: "https://www.thegospelcoalition.org/article/bible-study-observation-interpretation-application/",
          tooltip: "Simple O-I-A framing (overview).",
        },
      ],
      aud: [
        {
          label: "Historical/cultural background",
          url: "https://bibleproject.com/explore/",
          tooltip: "Short book videos and themes (BibleProject).",
        },
      ],
      mean: [
        {
          label: "NET notes (open)",
          url: buildNetViewerHref(passage),
          tooltip: "NET translator notes and study notes (open in new tab).",
        },
      ],
      sim: [
        {
          label: "Cross references",
          url: "https://www.openbible.info/labs/cross-references/",
          tooltip: "Explore cross references by verse.",
        },
      ],
      diff: [
        {
          label: "Context basics",
          url: "https://www.desiringgod.org/articles/reading-the-bible-with-context",
          tooltip: "Why context matters for faithful application.",
        },
      ],
      app: [
        {
          label: "Application templates",
          url: "https://www.desiringgod.org/articles/how-to-apply-the-bible",
          tooltip: "Practical help turning meaning into action.",
        },
      ],
      notes: [],
      advStructure: [],
      advThemes: [],
      advCrossRefs: [],
      advWordStudy: [],
      advCommentary: [],
    };

    const list = [...baseTools, ...(sectionTools[toolsKey] ?? [])];

    // Ensure NET notes shortcut exists for meaning, if available.
    if (toolsKey === "mean") {
      list.unshift({
        label: "Open NET notes (new tab)",
        url: buildNetViewerHref(passage),
        tooltip: "Open on NETBible.org (notes are shown there).",
      });
    }

    // Ensure a generic “Open NET notes” is always available.
    list.push({
      label: "Open NET notes (new tab)",
      url: buildNetViewerHref(passage),
      tooltip: "Open on NETBible.org (notes are shown there).",
    });

    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolsKey, defaults.passage]);

  const showSaved = !!saved;

  return (
    <>
      <ToolsPanel open={toolsOpen} title={toolbarTitle} tools={toolLinks} onClose={() => setToolsOpen(false)} />

      <WinMomentModal
        open={winOpen}
        onClose={() => setWinOpen(false)}
        tenantLabel={tenantLabel}
        passage={defaults.passage || ""}
        dateLabel={dateLabel}
        completion={completion}
        sections={winSections}
        backToViewerHref={backToViewerHref}
        backToStudyHref={backToStudyHref}
      />

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700">{tenantLabel}</div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Study Session</h1>
              <div className="mt-2 text-sm text-slate-600">
                Track: <span className="font-semibold text-slate-900">{trackLabel(track)}</span> —{" "}
                <span className="text-slate-700">{trackSummary(track)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {showSaved ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Saved
                </span>
              ) : null}

              <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                Completion: {completion.pct}%
              </span>

              <a
                href={backToViewerHref}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Back
              </a>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Passage</div>
              <div className="mt-1 text-sm text-slate-800">{defaults.passage || "—"}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600">Date</div>
              <div className="mt-1 text-sm text-slate-800">{dateLabel}</div>
            </div>
          </div>
        </div>

        <form ref={formRef} action={action} className="mt-6">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-base font-semibold tracking-tight text-slate-900">Session settings</div>
            <div className="mt-1 text-sm text-slate-600">Passage, track, mode, genre, status, and date.</div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-slate-600">Passage</div>
                <input
                  name="passage"
                  defaultValue={defaults.passage}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                  placeholder="e.g., John 3:16-17"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600">Session date</div>
                <input
                  type="datetime-local"
                  name="session_date"
                  defaultValue={defaults.session_date}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600">Track</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill
                    label="Beginner"
                    value="beginner"
                    active={track === "beginner"}
                    onClick={() => setTrack("beginner")}
                  />
                  <Pill
                    label="Intermediate"
                    value="intermediate"
                    active={track === "intermediate"}
                    onClick={() => setTrack("intermediate")}
                  />
                  <Pill
                    label="Advanced"
                    value="advanced"
                    active={track === "advanced"}
                    onClick={() => setTrack("advanced")}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600">Mode</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Pill label="Guided" value="guided" active={mode === "guided"} onClick={() => setMode("guided")} />
                  <Pill label="Free" value="free" active={mode === "free"} onClick={() => setMode("free")} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="text-xs font-semibold text-slate-600">Genre</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <Pill
                      key={g}
                      label={g}
                      value={g}
                      active={normalizeGenreLabel(genreSelected) === g && !genreCustom}
                      onClick={() => {
                        setGenreSelected(g);
                        setGenreCustom("");
                      }}
                    />
                  ))}
                </div>

                <div className="mt-3">
                  <input
                    type="text"
                    value={genreCustom}
                    onChange={(e) => setGenreCustom(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                    placeholder="Custom genre (optional)"
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-600">Status</div>
                <select
                  name="status"
                  defaultValue={statusDefault}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                >
                  <option value="draft">Draft</option>
                  <option value="complete">Complete</option>
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Save
                </button>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-base font-semibold tracking-tight text-slate-900">Passage text</div>
            <div className="mt-1 text-sm text-slate-600">
              Fetch NIV text via API.Bible, or paste your own. (NET notes are available via NETBible.org.)
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleFetchNet}
                disabled={netLoading}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                {netLoading ? "Fetching…" : "Fetch text"}
              </button>

              <button
                type="button"
                onClick={openNetNotesInNewTab}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Open NET notes
              </button>

              {netLastFetched ? <span className="text-xs text-slate-500">Last fetched: {netLastFetched}</span> : null}
            </div>

            {netError ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {netError}
              </div>
            ) : null}

            <textarea
              ref={passageTextRef}
              name="passageText"
              defaultValue={defaults.passageText}
              className="mt-4 min-h-[220px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
              placeholder="Paste or fetch passage text here…"
            />
          </section>

          <CardShell title={obsTitle} helper={obsHelper} toolsKey="obs" onOpenTools={openTools}>
            <textarea
              name="obs"
              defaultValue={defaults.obs}
              className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
              placeholder={obsHint}
            />
          </CardShell>

          {mode === "guided" ? (
            <InlineHelp title="Context prompts (guided mode)">{checklist.map((c) => `• ${c}`).join("\n")}</InlineHelp>
          ) : null}

          {showIntermediate ? (
            <>
              <CardShell
                title="2) Original audience"
                helper="Who heard/read this first? What was their situation?"
                toolsKey="aud"
                onOpenTools={openTools}
              >
                <textarea
                  name="aud"
                  defaultValue={defaults.aud}
                  className="min-h-[150px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                  placeholder="Audience, setting, pressures, cultural background…"
                />
              </CardShell>

              <CardShell
                title="3) What did it mean to them?"
                helper="What would the original audience understand this to mean in THEIR world?"
                toolsKey="mean"
                onOpenTools={openTools}
              >
                <textarea
                  name="mean"
                  defaultValue={defaults.mean}
                  className="min-h-[150px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                  placeholder="Meaning to them, why it mattered, assumptions they already had…"
                />
              </CardShell>

              <CardShell
                title="4) How is our context similar?"
                helper="Bridge: what overlaps between their world and ours?"
                toolsKey="sim"
                onOpenTools={openTools}
              >
                <textarea
                  name="sim"
                  defaultValue={defaults.sim}
                  className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                  placeholder="Similarities (faith, struggles, community, temptations)…"
                />
              </CardShell>

              <CardShell
                title="5) How is our context different?"
                helper="Guardrail: name differences so you don’t misapply."
                toolsKey="diff"
                onOpenTools={openTools}
              >
                <textarea
                  name="diff"
                  defaultValue={defaults.diff}
                  className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                  placeholder="Differences (covenant, culture, setting, audience)…"
                />
              </CardShell>
            </>
          ) : null}

          <CardShell title={appTitle} helper={appHelper} toolsKey="app" onOpenTools={openTools}>
            <textarea
              name="app"
              defaultValue={defaults.app}
              className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
              placeholder={appHint}
            />
          </CardShell>

          {showAdvanced ? (
            <>
              <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="text-base font-semibold tracking-tight text-slate-900">Advanced study</div>
                <div className="mt-1 text-sm text-slate-600">
                  Optional deep-dive prompts for structure, themes, and cross-references.
                </div>
              </section>

              <CardShell
                title="A) Structure / argument flow"
                helper="Outline the logic or movement of the passage (claims → reasons → implications)."
                toolsKey="advStructure"
                onOpenTools={openTools}
              >
                <textarea
                  name="advStructure"
                  defaultValue={defaults.advStructure}
                  className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                  placeholder="Example: vv1–2 claim, vv3–5 reasons, vv6–8 application…"
                />
              </CardShell>

              <CardShell
                title="B) Big theological themes"
                helper={"What truths about God, humanity, salvation, covenant, kingdom, holiness, etc.\nshow up here?"}
                toolsKey="advThemes"
                onOpenTools={openTools}
              >
                <textarea
                  name="advThemes"
                  defaultValue={defaults.advThemes}
                  className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                  placeholder="List 2–5 themes and point to the verse(s) that show them."
                />
              </CardShell>

              <CardShell
                title="C) Cross references / intertext"
                helper="Search by keyword(s) (click-only). Add references you want to explore."
                toolsKey="advCrossRefs"
                onOpenTools={openTools}
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={xrefKeyword}
                      onChange={(e) => setXrefKeyword(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                      placeholder="Keyword(s) to search (e.g., love, faith, covenant)"
                    />
                    <button
                      type="button"
                      onClick={handleCrossRefSearch}
                      disabled={xrefLoading}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      title="Search for verses matching your keyword(s)"
                    >
                      {xrefLoading ? "Searching…" : "Search"}
                    </button>
                  </div>

                  {xrefError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      {xrefError}
                    </div>
                  ) : null}

                  {xrefResults && xrefResults.length ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        Search results{xrefResultQuery ? `: ${xrefResultQuery}` : ""}
                      </div>
                      <div className="mt-3 space-y-3">
                        {xrefResults.map((v, idx) => (
                          <div key={`${v.reference}-${idx}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{v.reference || "(unknown reference)"}</div>
                                {v.text ? <div className="mt-1 text-sm text-slate-700">{v.text}</div> : null}
                              </div>
                              <button
                                type="button"
                                onClick={() => appendCrossRef(v.reference)}
                                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                                title="Append this reference to the Cross references box"
                              >
                                Add ref
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {xrefCitation ? <div className="mt-3 text-xs text-slate-500">{xrefCitation}</div> : null}
                    </div>
                  ) : null}

                  <textarea
                    ref={advCrossRefsRef}
                    name="advCrossRefs"
                    defaultValue={defaults.advCrossRefs}
                    className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                    placeholder="Write references and what connection you see (theme/phrase/concept)."
                  />
                </div>
              </CardShell>

              <CardShell
                title="D) Word study (key terms)"
                helper={"Choose 1–3 key words.\nDefine them from context, then check lexicon/interlinear."}
                toolsKey="advWordStudy"
                onOpenTools={openTools}
              >
                <textarea
                  name="advWordStudy"
                  defaultValue={defaults.advWordStudy}
                  className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                  placeholder="Word → meaning in context → other uses → how it impacts interpretation."
                />
              </CardShell>

              <CardShell
                title="E) Commentary / questions to resolve"
                helper="Summarize what you found from a trusted resource and list any remaining questions."
                toolsKey="advCommentary"
                onOpenTools={openTools}
              >
                <textarea
                  name="advCommentary"
                  defaultValue={defaults.advCommentary}
                  className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
                  placeholder="What did you learn? What are 1–3 questions you still need to resolve?"
                />
              </CardShell>
            </>
          ) : null}

          <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-base font-semibold tracking-tight text-slate-900">Notes</div>
            <div className="mt-1 text-sm text-slate-600">Capture extra insights, questions, and prayer notes.</div>
          </section>

          <CardShell
            title="Additional notes (optional)"
            helper="Extra notes, cross references, prayer notes, questions…"
            toolsKey="notes"
            onOpenTools={openTools}
          >
            <textarea
              name="notes"
              defaultValue={defaults.notes}
              className="min-h-[200px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
              placeholder="Write anything helpful here…"
            />
          </CardShell>

          {/* Preserve hidden fields behavior */}
          <input type="hidden" name="track" value={track} readOnly />
          <input type="hidden" name="mode" value={mode} readOnly />
          <input type="hidden" name="genre" value={genreSelected} readOnly />
          <input type="hidden" name="genre_custom" value={genreCustom} readOnly />
        </form>
      </div>
    </>
  );
}
