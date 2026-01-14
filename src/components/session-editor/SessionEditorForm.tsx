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
  backToViewerHref: string;
  backToStudyHref: string;
  defaults: SessionEditorDefaults;
  action: (formData: FormData) => void;
};

type ToolLink = {
  label: string;
  url: string;
  tooltip: string;
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
  // accept prior variants
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
      return "Write observations about imagery/parallelism/contrasts. Avoid jumping to meaning yet.";
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
      return "Write text-based observations. Use the tools if you’re not sure where to start.";
  }
}

// Flutter parity: copy that auto-shifts by Track
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
      return "Observation = what the text says. Start with repeated words, people, contrasts, cause/effect.";
    case "advanced":
      return "Stay text-first. Mark imperatives, discourse flow (claims → reasons → implications), contrasts, and repeated terms.";
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
      return "Write one clear response that you can actually do this week. Keep it simple and honest.";
    case "intermediate":
      return "Write a specific response that is faithful to the text and wise for today.";
    case "advanced":
      return "State a text-grounded obedience response (motive + measurable step + timeframe). Keep it God-centered.";
  }
}

function copyAppHint(track: StudyTrack) {
  switch (track) {
    case "advanced":
      return "Example: “Therefore, I will ___ because ___ (tied to the text), by ___, so that ___.”";
    case "beginner":
    case "intermediate":
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

// Flutter parity: section-specific tools (wrench button)
const TOOLS_BY_CARD: Record<string, ToolLink[]> = {
  passageText: [
    {
      label: "NET API (plain text)",
      url: "https://labs.bible.org/api/?passage=John+3:16-17",
      tooltip: "Opens NET passage output (easy copy/paste)",
    },
    {
      label: "StepBible",
      url: "https://www.stepbible.org/",
      tooltip: "Find a passage + compare tools",
    },
    { label: "ESV Bible", url: "https://www.esv.org/", tooltip: "Clean passage text for copy/paste" },
    {
      label: "BibleGateway",
      url: "https://www.biblegateway.com/",
      tooltip: "Compare translations before pasting",
    },
  ],
  genre: [
    {
      label: "BibleGateway (Genres)",
      url: "https://www.biblegateway.com/learn/bible-101/about-the-bible/biblical-genres/",
      tooltip: "Genre overview + examples",
    },
    {
      label: "BibleProject (How to Read)",
      url: "https://bibleproject.com/videos/collections/how-to-read-the-bible/",
      tooltip: "Visual + conceptual, very accessible",
    },
  ],
  context: [
    {
      label: "BibleProject",
      url: "https://bibleproject.com/explore/book-overviews/",
      tooltip: "Background + structure",
    },
    {
      label: "StepBible",
      url: "https://www.stepbible.org/",
      tooltip: "Cross-refs + study tools",
    },
    {
      label: "Bible Odyssey",
      url: "https://www.bibleodyssey.org/",
      tooltip: "Cultural background",
    },
    { label: "NET Bible", url: "https://netbible.org/", tooltip: "Translator notes explain why wording matters" },
  ],
  obs: [
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Read in context + notes + cross-refs" },
    {
      label: "Blue Letter Bible",
      url: "https://www.blueletterbible.org/",
      tooltip: "Interlinear + key word lookups",
    },
    { label: "NET Bible", url: "https://netbible.org/", tooltip: "Translator notes explain why wording matters" },
    {
      label: "OpenBible (Cross-refs)",
      url: "https://www.openbible.info/labs/cross-references/",
      tooltip: "Visualizes textual connections",
    },
  ],
  aud: [
    {
      label: "BibleProject",
      url: "https://bibleproject.com/explore/book-overviews/",
      tooltip: "Audience + historical setting",
    },
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Notes + background tools" },
  ],
  mean: [
    { label: "BibleProject (Themes)", url: "https://bibleproject.com/explore/themes/", tooltip: "Explore themes" },
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Compare translations + notes" },
    {
      label: "Blue Letter Bible",
      url: "https://www.blueletterbible.org/",
      tooltip: "Check key terms (don’t overdo it)",
    },
  ],
  sim: [
    { label: "BibleProject (Themes)", url: "https://bibleproject.com/explore/themes/", tooltip: "Themes that carry over" },
    {
      label: "GotQuestions",
      url: "https://www.gotquestions.org/",
      tooltip: "Topic summary (compare carefully)",
    },
  ],
  diff: [
    { label: "BibleProject (Covenants)", url: "https://bibleproject.com/videos/covenants/", tooltip: "Covenant/storyline differences" },
    { label: "StepBible", url: "https://www.stepbible.org/", tooltip: "Cross-refs to clarify scope" },
  ],
  app: [
    {
      label: "BibleProject (Character of God)",
      url: "https://bibleproject.com/videos/collections/character-of-god/",
      tooltip: "Keep application God-centered",
    },
  ],
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
  {
    title: "BibleProject — Book Overviews",
    subtitle: "Quick context + structure for every book.",
    url: "https://bibleproject.com/explore/book-overviews/",
  },
  { title: "ESV Bible", subtitle: "Clean passage text for copy/paste", url: "https://www.esv.org/" },
  { title: "NET Bible", subtitle: "Translator notes explain why wording matters", url: "https://netbible.org/" },
  { title: "StepBible — Free study tools", subtitle: "Cross references, lexicon, notes.", url: "https://www.stepbible.org/" },
  { title: "Blue Letter Bible — Interlinear + Lexicon", subtitle: "Word study, original language tools.", url: "https://www.blueletterbible.org/" },
  { title: "GotQuestions (use discernment)", subtitle: "Fast topic summaries; compare with Scripture.", url: "https://www.gotquestions.org/" },
];

function ToolsModal({
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold">{title}</div>
            <div className="mt-1 text-xs font-medium text-slate-500">
              Tap a tool to open it in your browser.
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {tools.length ? (
            tools.map((t) => (
              <a
                key={`${t.label}-${t.url}`}
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="group rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
                title={t.tooltip}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{t.label}</div>
                    <div className="mt-1 text-xs text-slate-600">{t.tooltip}</div>
                  </div>
                  <div className="text-xs font-semibold text-slate-400 group-hover:text-slate-600">
                    ↗
                  </div>
                </div>
              </a>
            ))
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              No tools linked for this step yet.
            </div>
          )}
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
  defaultOpen = false,
  id,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
  toolsKey?: string;
  onOpenTools?: (key: string, title: string) => void;
  defaultOpen?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold tracking-tight">{title}</div>
          {helper ? <div className="mt-1 text-sm text-slate-600">{helper}</div> : null}
        </div>

        {toolsKey && onOpenTools ? (
          <button
            type="button"
            className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
            onClick={() => onOpenTools(toolsKey, `Tools for ${title.replace(/^\d+\)\s*/, "")}`)}
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

export function SessionEditorForm({
  tenantLabel,
  saved,
  backToViewerHref,
  backToStudyHref,
  defaults,
  action,
}: Props) {
  const [track, setTrack] = React.useState<StudyTrack>(
    (defaults.track || "beginner") as StudyTrack
  );
  const [mode, setMode] = React.useState<"guided" | "free">(defaults.mode || "guided");
  const [genreSelected, setGenreSelected] = React.useState<string>(
    normalizeGenreLabel(defaults.genre || "Unknown")
  );
  const [genreCustom, setGenreCustom] = React.useState<string>("");
  const [toolsOpen, setToolsOpen] = React.useState(false);
  const [toolsTitle, setToolsTitle] = React.useState("Tools");
  const [toolsKey, setToolsKey] = React.useState<string>("");

  const showIntermediate = track === "intermediate" || track === "advanced";
  const showAdvanced = track === "advanced";

  const genreFinal = normalizeGenreLabel(genreCustom ? genreCustom : genreSelected);

  function openTools(key: string, title: string) {
    setToolsKey(key);
    setToolsTitle(title);
    setToolsOpen(true);
  }

  const obsTitle = copyObsTitle(track);
  const obsHelper = copyObsHelper(track);
  const obsHint = copyObsHint(track, genreFinal);

  const appTitle = showIntermediate ? "6) Application / response" : "2) Application / response";
  const appHelper = copyAppHelper(track);
  const appHint = copyAppHint(track);

  const checklist = contextChecklist(genreFinal);

  return (
    <form action={action} className="grid gap-6">
      <ToolsModal
        open={toolsOpen}
        title={toolsTitle}
        tools={TOOLS_BY_CARD[toolsKey] ?? []}
        onClose={() => setToolsOpen(false)}
      />

      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Bible Study • {tenantLabel}</div>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {defaults.passage ? defaults.passage : "Study session"}
            </h1>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                Track: {trackLabel(track)}
              </span>
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                Mode: {mode}
              </span>
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                Genre: {genreFinal === "Unknown" ? "General" : genreFinal}
              </span>
              <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                {trackSummary(track)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
              href={backToStudyHref}
            >
              Back to study
            </a>
            <a
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50"
              href={backToViewerHref}
            >
              Back to viewer
            </a>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              Save
            </button>
          </div>
        </div>

        {saved ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Saved.
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-slate-600">Passage reference</label>
            <input
              name="passage"
              defaultValue={defaults.passage}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
              placeholder="e.g., John 1:1–18"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Session date</label>
            <input
              name="session_date"
              type="datetime-local"
              defaultValue={defaults.session_date}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Track</label>
            <select
              name="track"
              defaultValue={defaults.track}
              onChange={(e) => setTrack((e.target.value as StudyTrack) || "beginner")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Mode</label>
            <select
              name="mode"
              defaultValue={defaults.mode}
              onChange={(e) => setMode((e.target.value as "guided" | "free") || "guided")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
            >
              <option value="guided">guided</option>
              <option value="free">free</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Status</label>
            <select
              name="status"
              defaultValue={defaults.status}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
            >
              <option value="draft">draft</option>
              <option value="complete">complete</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Genre</label>
            <select
              name="genre"
              value={genreSelected}
              onChange={(e) => setGenreSelected(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
            >
              {GENRES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <input
              name="genre_custom"
              value={genreCustom}
              onChange={(e) => setGenreCustom(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
              placeholder="Custom genre (optional)"
            />
            <div className="mt-2 text-xs text-slate-600">
              <span className="font-semibold">Genre lens:</span>{" "}
              {genreFinal === "Unknown" ? "Use general prompts." : "Genre shapes what to look for."}
            </div>
          </div>
        </div>
      </section>

      {/* Free resources (all) */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold tracking-tight">Free resources (all)</div>
            <div className="mt-1 text-sm text-slate-600">
              Global list of tools you can reference anytime.
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {GLOBAL_RESOURCES.map((r) => (
            <a
              key={r.url}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50"
            >
              <div className="text-sm font-semibold text-slate-900">{r.title}</div>
              <div className="mt-1 text-xs text-slate-600">{r.subtitle}</div>
            </a>
          ))}
        </div>
      </section>

      {/* Setup: Genre lens + Passage text */}
      <CardShell
        title="Genre lens"
        helper="Genre shapes what to look for."
        toolsKey="genre"
        onOpenTools={openTools}
      >
        <div className="text-xs font-semibold text-slate-600">
          Tip: Use the 🛠️ Tools button for genre references without leaving this step.
        </div>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {genreFinal === "Unknown"
            ? "If you’re not sure, keep it as Unknown and start with the general prompts."
            : `Selected genre: ${genreFinal}`}
        </div>
      </CardShell>

      <CardShell
        title="Paste passage text (optional)"
        helper="This enables repeated-word suggestions and makes observation easier."
        toolsKey="passageText"
        onOpenTools={openTools}
      >
        <textarea
          name="passageText"
          defaultValue={defaults.passageText}
          className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
          placeholder="Paste the verses here… (optional)"
        />
        <div className="mt-2 text-xs text-slate-600">
          Tip: If you paste full text, you’ll spot repeated terms and structure more easily.
        </div>
      </CardShell>

      {showIntermediate ? (
        <CardShell
          title="Historical / cultural context (Intermediate)"
          helper="Answer “Who/why/what was happening?” so application stays accurate."
          toolsKey="context"
          onOpenTools={openTools}
        >
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">
              Quick checklist ({genreFinal === "Unknown" ? "General" : genreFinal})
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              {checklist.slice(0, 3).map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-slate-600">
              Templates live in the Audience / Meaning boxes below (open those cards and start with simple bullets).
            </div>
          </div>
        </CardShell>
      ) : null}

      {/* Guided study prompts */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-base font-semibold tracking-tight">Guided study prompts</div>
        <div className="mt-1 text-sm text-slate-600">
          Work top to bottom. Keep it text-based before interpreting.
        </div>
      </section>

      <CardShell title={obsTitle} helper={obsHelper} toolsKey="obs" onOpenTools={openTools} id="obs">
        <textarea
          name="obs"
          defaultValue={defaults.obs}
          className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
          placeholder={obsHint}
        />
      </CardShell>

      {showIntermediate ? (
        <>
          <CardShell
            title="2) Original audience"
            helper="Who heard/read this first? What was their situation?"
            toolsKey="aud"
            onOpenTools={openTools}
            id="aud"
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
            id="mean"
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
            id="sim"
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
            id="diff"
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

      <CardShell title={appTitle} helper={appHelper} toolsKey="app" onOpenTools={openTools} id="app">
        <textarea
          name="app"
          defaultValue={defaults.app}
          className="min-h-[180px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
          placeholder={appHint}
        />
      </CardShell>

      {showAdvanced ? (
        <>
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="text-base font-semibold tracking-tight">Advanced study</div>
            <div className="mt-1 text-sm text-slate-600">
              Optional deep-dive prompts for structure, themes, and cross-references.
            </div>
          </section>

          <CardShell
            title="A) Structure / argument flow"
            helper="Outline the logic or movement of the passage (claims → reasons → implications)."
            toolsKey="advStructure"
            onOpenTools={openTools}
            id="advStructure"
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
            helper="What truths about God, humanity, salvation, covenant, kingdom, holiness, etc. show up here?"
            toolsKey="advThemes"
            onOpenTools={openTools}
            id="advThemes"
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
            helper="Where does Scripture interpret Scripture? Note OT echoes, quotations, or parallel passages."
            toolsKey="advCrossRefs"
            onOpenTools={openTools}
            id="advCrossRefs"
          >
            <textarea
              name="advCrossRefs"
              defaultValue={defaults.advCrossRefs}
              className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
              placeholder="Write references and what connection you see (theme/phrase/concept)."
            />
          </CardShell>

          <CardShell
            title="D) Word study (key terms)"
            helper="Choose 1–3 key words. Define them from context, then check lexicon/interlinear."
            toolsKey="advWordStudy"
            onOpenTools={openTools}
            id="advWordStudy"
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
            id="advCommentary"
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

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="text-base font-semibold tracking-tight">Notes</div>
        <div className="mt-1 text-sm text-slate-600">
          Capture extra insights, questions, and prayer notes.
        </div>
      </section>

      <CardShell
        title="Additional notes (optional)"
        helper="Extra notes, cross references, prayer notes, questions…"
        toolsKey="notes"
        onOpenTools={openTools}
        id="notes"
      >
        <textarea
          name="notes"
          defaultValue={defaults.notes}
          className="min-h-[200px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-slate-300"
          placeholder="Write anything helpful here…"
        />
      </CardShell>

      {/* keep inputs present so server action always receives them */}
      <input type="hidden" name="track" value={track} readOnly />
      <input type="hidden" name="mode" value={mode} readOnly />
      <input type="hidden" name="genre" value={genreSelected} readOnly />
      <input type="hidden" name="genre_custom" value={genreCustom} readOnly />
    </form>
  );
}
