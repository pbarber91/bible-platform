"use client";

import React, { useMemo, useState } from "react";

type Hint = { title: string; bullets: string[] };

export type SessionEditorDefaults = {
  passage: string;
  track: string;
  mode: string;
  genre: string;
  status: string;
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

function normalizeGenre(raw: string) {
  const v = (raw || "").trim();
  return v ? v : "Unknown";
}

function genreHint(genreRaw: string): Hint {
  const g = (genreRaw || "").trim().toLowerCase();

  const map: Record<string, Hint> = {
    gospel: {
      title: "Gospel lens",
      bullets: [
        "Look for Jesus’ identity, mission, and claims.",
        "Track belief/unbelief, signs, and responses.",
        "Note repeated themes (light, life, truth, kingdom).",
      ],
    },
    narrative: {
      title: "Narrative lens",
      bullets: [
        "Observe setting, characters, conflict, and resolution.",
        "Track repeated words/actions and turning points.",
        "Ask what the narrator wants you to notice.",
      ],
    },
    epistle: {
      title: "Epistle lens",
      bullets: [
        "Outline the argument (because/therefore).",
        "Mark indicatives (what’s true) and imperatives (what to do).",
        "Note repeated terms and key connectors.",
      ],
    },
    poetry: {
      title: "Poetry lens",
      bullets: [
        "Look for parallelism, imagery, and repetition.",
        "Note emotional movement (lament → trust, etc.).",
        "Watch for metaphors and emphasis patterns.",
      ],
    },
    wisdom: {
      title: "Wisdom lens",
      bullets: [
        "Is it a proverb, principle, warning, or observation?",
        "Note general patterns vs universal promises.",
        "Look for contrasts (wise/fool) and cause/effect.",
      ],
    },
    prophecy: {
      title: "Prophecy lens",
      bullets: [
        "Identify audience, covenant context, and purpose.",
        "Note rebuke, warning, call to repent, and hope.",
        "Look for near/far horizons (immediate + future).",
      ],
    },
    apocalyptic: {
      title: "Apocalyptic lens",
      bullets: [
        "Expect symbols; note repeated images and numbers.",
        "Ask what the symbols communicate (not literal detail).",
        "Track comfort/hope + judgment themes.",
      ],
    },
    law: {
      title: "Law lens",
      bullets: [
        "Note the command and the purpose behind it.",
        "Ask how it fits covenant life (holiness, justice, worship).",
        "Look for moral/civil/ceremonial patterns.",
      ],
    },
    unknown: {
      title: "Genre lens",
      bullets: [
        "Pick a broad genre to get tailored observation hints.",
        "If unsure, start with Narrative / Epistle / Poetry.",
      ],
    },
  };

  const key =
    g.includes("gospel")
      ? "gospel"
      : g.includes("narr")
      ? "narrative"
      : g.includes("epist")
      ? "epistle"
      : g.includes("poet")
      ? "poetry"
      : g.includes("wis")
      ? "wisdom"
      : g.includes("prophe")
      ? "prophecy"
      : g.includes("apocal")
      ? "apocalyptic"
      : g === "law" || g.includes("torah")
      ? "law"
      : g
      ? g
      : "unknown";

  return map[key] ?? map.unknown;
}

// -------------------------------
// Track-aware copy (mirrors Flutter intent)
// -------------------------------
type TrackCopy = {
  obsTitle: string;
  obsHelper: string;
  obsHint: string;
  obsPlaceholder: string;

  appTitle: string;
  appHelper: string;
  appHint: string;
  appPlaceholder: string;

  audienceHelper: string;
  meaningHelper: string;
  similarHelper: string;
  differentHelper: string;
};

function baseGenreObservationHint(h: Hint): string {
  return `${h.title}\n• ${h.bullets.join("\n• ")}`;
}

function trackCopy(trackRaw: string, hint: Hint): TrackCopy {
  const t = (trackRaw || "").toLowerCase();
  const base = baseGenreObservationHint(hint);

  const obsTitle =
    t === "advanced"
      ? "1) Observations (imperatives / flow)"
      : t === "intermediate"
      ? "1) Important words / observations"
      : "1) What do you notice?";

  const obsHelper =
    t === "advanced"
      ? "Stay text-first. Mark imperatives, discourse flow (claims → reasons → implications), contrasts, and repeated terms."
      : t === "intermediate"
      ? "Observation = what the text says. Start with repeated words, people, contrasts, cause/effect."
      : "Slow down and list what you see in the text (repeated words, people, actions, “because/therefore”, contrasts).";

  const obsHint =
    t === "advanced"
      ? `${base}\n\nAlso note: imperatives, conjunctions (“therefore/because”), and argument structure.`
      : t === "intermediate"
      ? base
      : `${base}\n\nStarter: “I notice ___.”`;

  const obsPlaceholder =
    t === "advanced"
      ? "Write observations (text-first). Mark imperatives, connectors (therefore/because), contrasts, repeated terms, and argument flow…"
      : t === "intermediate"
      ? "List observations: repeated words, people, contrasts, cause/effect, key connectors…"
      : "Start with: “I notice ___.” (Repeated words, people, actions, contrasts, because/therefore…)";

  const appTitle = t === "beginner" ? "2) Application / Response" : "6) Application / Response";

  const appHelper =
    t === "advanced"
      ? "State a text-grounded obedience response (motive + measurable step + timeframe). Keep it God-centered."
      : t === "intermediate"
      ? "Write a specific response that is faithful to the text and wise for today."
      : "Write one clear response that you can actually do this week. Keep it simple and honest.";

  const appHint =
    t === "advanced"
      ? "Example: “Therefore, I will ___ because ___ (tied to the text), by ___, so that ___.”"
      : "Example: “This week I will ___ because ___ … by ___.”";

  const appPlaceholder =
    t === "advanced"
      ? "Therefore, I will ___ because ___ (tied to the text), by ___, so that ___…"
      : "This week I will ___ because ___ … by ___.";

  const audienceHelper =
    t === "advanced"
      ? "Who is speaking/writing, to whom, and why? What is the occasion and situation?"
      : "Who is the original audience? What did they know/assume? What is happening around the passage?";

  const meaningHelper =
    t === "advanced"
      ? "Summarize the author’s main claim and support. What is the point being made?"
      : "In one or two sentences: what did this passage mean to them (then)?";

  const similarHelper =
    t === "advanced"
      ? "Where do we share similar heart patterns, pressures, needs, and temptations?"
      : "What’s similar between their world and ours (people, problems, worship, fears, hopes)?";

  const differentHelper =
    t === "advanced"
      ? "What covenant/historical differences matter (time, culture, redemptive history)?"
      : "What’s different about our situation that affects how we apply this wisely?";

  return {
    obsTitle,
    obsHelper,
    obsHint,
    obsPlaceholder,
    appTitle,
    appHelper,
    appHint,
    appPlaceholder,
    audienceHelper,
    meaningHelper,
    similarHelper,
    differentHelper,
  };
}

function firstMeaningfulLine(raw: string) {
  for (const line of (raw || "").split("\n")) {
    const s = line.trim();
    if (!s) continue;
    return s.replace(/^[•\-\*]\s*/, "").trim();
  }
  return "";
}

function ToolsPanel(props: { section: string; genre: string }) {
  const g = (props.genre || "").toLowerCase();

  const baseLinks: Array<{ label: string; href: string }> = [
    { label: "BibleHub (interlinear/commentaries)", href: "https://biblehub.com/" },
    { label: "Blue Letter Bible (lexicons/tools)", href: "https://www.blueletterbible.org/" },
    { label: "STEP Bible (original languages)", href: "https://www.stepbible.org/" },
    { label: "ESV (read passage)", href: "https://www.esv.org/" },
  ];

  const sectionNotes: Record<string, string> = {
    observation:
      "Use tools to slow down: repeated words, connectors (therefore/because), key terms, and cross references.",
    audience: "Look at book introductions, audience/background notes, and historical setting.",
    meaning: "Check passage outlines and paragraph structure. Track the argument flow.",
    application: "Keep it text-grounded: move from meaning → principle → one measurable step.",
    notes: "Use notes for prayer, questions, uncertainties, and what to revisit later.",
  };

  const genreNote =
    g.includes("poet") || g.includes("psalm")
      ? "For poetry/psalms: watch parallel lines, imagery, emotional movement."
      : g.includes("epist")
      ? "For epistles: outline the argument; mark indicatives vs imperatives."
      : g.includes("narr")
      ? "For narrative: track characters, conflict, turning points, and repeated motifs."
      : g.includes("gospel")
      ? "For gospels: track belief/unbelief, signs, and what Jesus reveals about Himself."
      : g.includes("prophe")
      ? "For prophecy: identify covenant context, warning/hope, near/far horizons."
      : g.includes("apocal")
      ? "For apocalyptic: focus on symbols and what they communicate (not microscopic literalism)."
      : g.includes("law") || g.includes("torah")
      ? "For law: ask the purpose behind the command and how it shaped covenant life."
      : "";

  return (
    <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer text-xs font-semibold text-slate-700">Tools</summary>
      <div className="mt-2 grid gap-2 text-xs text-slate-600">
        <div>{sectionNotes[props.section] ?? "Use tools to support careful reading."}</div>
        {genreNote ? <div className="rounded-lg bg-slate-50 p-2">{genreNote}</div> : null}
        <ul className="list-disc pl-5">
          {baseLinks.map((l) => (
            <li key={l.href}>
              <a className="underline hover:no-underline" href={l.href} target="_blank" rel="noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function Modal(props: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div className="text-base font-semibold">{props.title}</div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        <div className="mt-3">{props.children}</div>
      </div>
    </div>
  );
}

export function SessionEditorForm(props: {
  tenantLabel: string;
  saved: boolean;
  backToViewerHref: string;
  backToStudyHref: string;
  defaults: SessionEditorDefaults;
  action: (formData: FormData) => void; // server action already bound (personal OR church)
}) {
  const [track, setTrack] = useState(props.defaults.track || "beginner");
  const [genre, setGenre] = useState(normalizeGenre(props.defaults.genre || "Unknown"));

  // For the win moment preview (client-side)
  const [obsPreview, setObsPreview] = useState(props.defaults.obs || "");
  const [appPreview, setAppPreview] = useState(props.defaults.app || "");
  const [winOpen, setWinOpen] = useState(false);

  const isBeginner = (track || "").toLowerCase() === "beginner";
  const isAdvanced = (track || "").toLowerCase() === "advanced";

  const hint = useMemo(() => genreHint(genre), [genre]);
  const copy = useMemo(() => trackCopy(track, hint), [track, hint]);

  const winObs = firstMeaningfulLine(obsPreview);
  const winApp = firstMeaningfulLine(appPreview);

  const obsLine = winObs || "— (No observation captured yet)";
  const appLine = winApp || "— (No application written yet)";

  return (
    <div className="grid gap-6" id="top">
      <Modal open={winOpen} onClose={() => setWinOpen(false)} title="Session complete (preview)">
        <div className="text-sm text-slate-700">
          <div className="font-semibold">Faithful study is slow and patient. Well done.</div>

          <div className="mt-3 grid gap-2">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold text-slate-800">1 key observation</div>
              <div className="mt-1 text-sm">{obsLine}</div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold text-slate-800">1 application step</div>
              <div className="mt-1 text-sm">{appLine}</div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs font-semibold text-slate-800">Optional prayer</div>
              <div className="mt-1 text-sm leading-relaxed">
                “Lord, help me believe and obey what You showed me today. Give me strength to follow through, and love
                to walk it out with humility. Amen.”
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const text = `Observation: ${obsLine}\nApplication: ${appLine}`;
                try {
                  await navigator.clipboard.writeText(text);
                } catch {
                  // ignore (clipboard permissions)
                }
              }}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Copy highlights
            </button>
          </div>
        </div>
      </Modal>

      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">Study Session • {props.tenantLabel}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Session Editor</h1>
            <div className="mt-2 text-sm text-slate-600">Work top to bottom. Keep it text-based before interpreting.</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={props.backToViewerHref}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Back to viewer
            </a>
            <a
              href={props.backToStudyHref}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            >
              Back to study
            </a>
          </div>
        </div>

        {props.saved ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Saved.
          </div>
        ) : null}
      </section>

      <form action={props.action} className="grid gap-6">
        {/* Setup */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 text-sm font-semibold">Session setup</div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">Session date</label>
              <input
                name="session_date"
                type="datetime-local"
                defaultValue={props.defaults.session_date}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Passage reference (optional)</label>
              <input
                name="passage"
                defaultValue={props.defaults.passage}
                placeholder="John 1:1–18"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <div>
              <label className="text-xs font-semibold text-slate-600">Track</label>
              <select
                name="track"
                value={track}
                onChange={(e) => setTrack(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              >
                <option value="beginner">beginner</option>
                <option value="intermediate">intermediate</option>
                <option value="advanced">advanced</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">Copy + what’s shown updates instantly (no save needed).</div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Mode</label>
              <select
                name="mode"
                defaultValue={props.defaults.mode}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              >
                <option value="guided">guided</option>
                <option value="freeform">freeform</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-600">Genre</label>
              <select
                name="genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              >
                <option value="Unknown">Unknown</option>
                <option value="Gospel">Gospel</option>
                <option value="Narrative">Narrative</option>
                <option value="Epistle">Epistle</option>
                <option value="Poetry">Poetry</option>
                <option value="Wisdom">Wisdom</option>
                <option value="Prophecy">Prophecy</option>
                <option value="Apocalyptic">Apocalyptic</option>
                <option value="Law">Law</option>
                <option value="Other">Other</option>
              </select>

              <div className="mt-2 grid gap-2">
                <div className="text-xs text-slate-500">
                  If you picked <span className="font-semibold">Other</span>, type a custom genre label here (optional):
                </div>
                <input
                  name="genre_custom"
                  defaultValue=""
                  placeholder="Custom genre (optional)"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-600">Status</label>
              <select
                name="status"
                defaultValue={props.defaults.status}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              >
                <option value="draft">draft</option>
                <option value="complete">complete</option>
              </select>
              <div className="mt-1 text-xs text-slate-500">Mark complete when you’re done. (Preview available below.)</div>
            </div>

            <div className="flex items-end gap-2 sm:col-span-2">
              <button
                type="button"
                onClick={() => setWinOpen(true)}
                className="w-full rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
              >
                Win moment preview
              </button>
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </section>

        {/* Genre lens */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-sm font-semibold">Genre lens</div>
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-800">{hint.title}</div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
              {hint.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <div className="mt-2 whitespace-pre-line text-xs text-slate-600">{copy.obsHint}</div>
            <ToolsPanel section="observation" genre={genre} />
          </div>
        </section>

        {/* Passage text */}
        <details className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" open={isBeginner ? true : undefined}>
          <summary className="cursor-pointer text-sm font-semibold">Paste passage text (optional)</summary>
          <div className="mt-4 grid gap-2">
            <div className="text-xs text-slate-500">Clean passage text for copy/paste. This can help your observation step.</div>
            <textarea
              name="passageText"
              defaultValue={props.defaults.passageText}
              rows={8}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              placeholder="Paste the passage text here (optional)…"
            />
          </div>
        </details>

        {/* Guided prompts */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-2 text-sm font-semibold">Guided study prompts</div>

          <div className="grid gap-3">
            {/* 1) Observation */}
            <details className="rounded-xl border border-slate-200 p-4" open>
              <summary className="cursor-pointer text-sm font-semibold">{copy.obsTitle}</summary>
              <div className="mt-3 text-xs text-slate-600">{copy.obsHelper}</div>

              <textarea
                id="obs"
                name="obs"
                defaultValue={props.defaults.obs}
                onChange={(e) => setObsPreview(e.target.value)}
                rows={6}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder={copy.obsPlaceholder}
              />

              <ToolsPanel section="observation" genre={genre} />
            </details>

            {/* Beginner skips the middle prompts */}
            {!isBeginner ? (
              <>
                <details className="rounded-xl border border-slate-200 p-4">
                  <summary className="cursor-pointer text-sm font-semibold">2) Original audience</summary>
                  <div className="mt-3 text-xs text-slate-600">{copy.audienceHelper}</div>
                  <textarea
                    id="aud"
                    name="aud"
                    defaultValue={props.defaults.aud}
                    rows={5}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                    placeholder="Audience, setting, purpose, pressures…"
                  />
                  <ToolsPanel section="audience" genre={genre} />
                </details>

                <details className="rounded-xl border border-slate-200 p-4">
                  <summary className="cursor-pointer text-sm font-semibold">3) What did it mean to them?</summary>
                  <div className="mt-3 text-xs text-slate-600">{copy.meaningHelper}</div>
                  <textarea
                    id="mean"
                    name="mean"
                    defaultValue={props.defaults.mean}
                    rows={5}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                    placeholder="Summarize the meaning (then). What is the author saying and why?"
                  />
                  <ToolsPanel section="meaning" genre={genre} />
                </details>

                <details className="rounded-xl border border-slate-200 p-4">
                  <summary className="cursor-pointer text-sm font-semibold">4) How is our context similar?</summary>
                  <div className="mt-3 text-xs text-slate-600">{copy.similarHelper}</div>
                  <textarea
                    id="sim"
                    name="sim"
                    defaultValue={props.defaults.sim}
                    rows={4}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                    placeholder="Similar heart patterns, pressures, needs, temptations…"
                  />
                </details>

                <details className="rounded-xl border border-slate-200 p-4">
                  <summary className="cursor-pointer text-sm font-semibold">5) How is our context different?</summary>
                  <div className="mt-3 text-xs text-slate-600">{copy.differentHelper}</div>
                  <textarea
                    id="diff"
                    name="diff"
                    defaultValue={props.defaults.diff}
                    rows={4}
                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                    placeholder="What differences matter for wise application today?"
                  />
                </details>
              </>
            ) : null}

            {/* Application */}
            <details className="rounded-xl border border-slate-200 p-4" open={isBeginner ? true : undefined}>
              <summary className="cursor-pointer text-sm font-semibold">{copy.appTitle}</summary>
              <div className="mt-3 text-xs text-slate-600">{copy.appHelper}</div>

              <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{copy.appHint}</div>

              <textarea
                id="app"
                name="app"
                defaultValue={props.defaults.app}
                onChange={(e) => setAppPreview(e.target.value)}
                rows={5}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder={copy.appPlaceholder}
              />

              <ToolsPanel section="application" genre={genre} />
            </details>

            {/* Notes (always visible, matches Flutter) */}
            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold">Notes</summary>
              <div className="mt-3 text-xs text-slate-600">
                Capture questions, prayer, uncertainties, key takeaways, and what you want to revisit later.
              </div>
              <textarea
                id="notes"
                name="notes"
                defaultValue={props.defaults.notes}
                rows={5}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="Notes, questions, prayer, next steps…"
              />
              <ToolsPanel section="notes" genre={genre} />
            </details>

            {/* Advanced add-ons */}
            {isAdvanced ? (
              <details className="rounded-xl border border-slate-200 p-4">
                <summary className="cursor-pointer text-sm font-semibold">Advanced study (optional)</summary>
                <div className="mt-3 grid gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-600">Structure / flow</div>
                    <textarea
                      name="advStructure"
                      defaultValue={props.defaults.advStructure}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                      placeholder="Outline the argument/scene flow. Claims → reasons → implications…"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">Themes</div>
                    <textarea
                      name="advThemes"
                      defaultValue={props.defaults.advThemes}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                      placeholder="Track repeated themes and how they develop across the passage…"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">Cross references</div>
                    <textarea
                      name="advCrossRefs"
                      defaultValue={props.defaults.advCrossRefs}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                      placeholder="List cross references that clarify meaning or connect themes…"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">Word study</div>
                    <textarea
                      name="advWordStudy"
                      defaultValue={props.defaults.advWordStudy}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                      placeholder="Key terms (original language, usage, nuance). Keep it tied to context…"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600">Commentary notes</div>
                    <textarea
                      name="advCommentary"
                      defaultValue={props.defaults.advCommentary}
                      rows={4}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                      placeholder="What did trusted resources confirm/challenge? Capture carefully…"
                    />
                  </div>
                </div>
              </details>
            ) : null}
          </div>
        </section>
      </form>
    </div>
  );
}

// Allow BOTH import styles:
// - import SessionEditorForm from "..."
// - import { SessionEditorForm } from "..."
export default SessionEditorForm;
