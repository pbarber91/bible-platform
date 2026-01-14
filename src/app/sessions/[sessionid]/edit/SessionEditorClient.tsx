"use client";

import * as React from "react";

type Hint = { title: string; bullets: string[] };

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

function trackCopy(trackRaw: string) {
  const t = (trackRaw || "").toLowerCase();

  // You can tune these whenever you want.
  if (t === "advanced") {
    return {
      obsTitle: "1) Observation (deep)",
      obsPlaceholder:
        "List observations + structure/flow, repeated terms, key connectors, and patterns…",
      appTitle: "6) Application (integrated)",
      appPlaceholder:
        "Apply with specificity: theology → principle → practice; include community implications…",
      appHelp:
        "Advanced: move from meaning to principles to concrete next steps (personal + communal).",
    };
  }

  if (t === "intermediate") {
    return {
      obsTitle: "1) Observation (focused)",
      obsPlaceholder:
        "What stands out? Repeated words, contrasts, progression, questions raised…",
      appTitle: "6) Application",
      appPlaceholder:
        "What should change because of this text? Be specific (belief, actions, habits)…",
      appHelp: "Intermediate: connect the main idea to specific choices this week.",
    };
  }

  // beginner default
  return {
    obsTitle: "1) Observation",
    obsPlaceholder: "What do you see in the text? Words, actions, people, repeated ideas…",
    appTitle: "6) Application",
    appPlaceholder: "What is one clear step of obedience or response for you?",
    appHelp: "Beginner: keep it simple—one clear response you can actually do.",
  };
}

export function SessionEditorClient(props: {
  action: (formData: FormData) => void;
  saved: boolean;

  headerKicker: string; // e.g. "Study Session • Personal" or "Study Session • Mission_Community_Church"
  backToViewerHref: string;
  backToStudyHref: string;

  defaults: {
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
}) {
  const [track, setTrack] = React.useState(props.defaults.track);
  const [genre, setGenre] = React.useState(normalizeGenre(props.defaults.genre));

  const isAdvanced = (track || "").toLowerCase() === "advanced";
  const hint = React.useMemo(() => genreHint(genre), [genre]);
  const copy = React.useMemo(() => trackCopy(track), [track]);

  return (
    <div className="grid gap-6" id="top">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500">{props.headerKicker}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Session Editor</h1>
            <div className="mt-2 text-sm text-slate-600">
              Work top to bottom. Keep it text-based before interpreting.
            </div>
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
              <label className="text-xs font-semibold text-slate-600">
                Passage reference (optional)
              </label>
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
              <div className="mt-1 text-xs text-slate-500">
                Changes Observation/Application prompts immediately.
              </div>
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
                onChange={(e) => setGenre(normalizeGenre(e.target.value))}
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
                  If you picked <span className="font-semibold">Other</span>, type a
                  custom genre label here (optional):
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
            </div>

            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Save
              </button>
            </div>
          </div>
        </section>

        {/* Passage text */}
        <details className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <summary className="cursor-pointer text-sm font-semibold">
            Paste passage text (optional)
          </summary>
          <div className="mt-4 grid gap-2">
            <div className="text-xs text-slate-500">
              Clean passage text for copy/paste. This can help your observation step.
            </div>
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
            <details className="rounded-xl border border-slate-200 p-4" open>
              <summary className="cursor-pointer text-sm font-semibold">{copy.obsTitle}</summary>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-800">{hint.title}</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                  {hint.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>

              <textarea
                id="obs"
                name="obs"
                defaultValue={props.defaults.obs}
                rows={6}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder={copy.obsPlaceholder}
              />
            </details>

            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold">2) Original audience</summary>
              <textarea
                id="aud"
                name="aud"
                defaultValue={props.defaults.aud}
                rows={5}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </details>

            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                3) What did it mean to them?
              </summary>
              <textarea
                id="mean"
                name="mean"
                defaultValue={props.defaults.mean}
                rows={5}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </details>

            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                4) How is our context similar?
              </summary>
              <textarea
                id="sim"
                name="sim"
                defaultValue={props.defaults.sim}
                rows={4}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </details>

            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                5) How is our context different?
              </summary>
              <textarea
                id="diff"
                name="diff"
                defaultValue={props.defaults.diff}
                rows={4}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </details>

            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold">{copy.appTitle}</summary>

              <div className="mt-2 text-xs text-slate-500">{copy.appHelp}</div>

              <textarea
                id="app"
                name="app"
                defaultValue={props.defaults.app}
                rows={5}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder={copy.appPlaceholder}
              />
            </details>
          </div>
        </section>

        {isAdvanced ? (
          <details className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <summary className="cursor-pointer text-sm font-semibold">Advanced study</summary>
            <div className="mt-4 grid gap-3">
              <textarea
                id="advStructure"
                name="advStructure"
                defaultValue={props.defaults.advStructure}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="Structure / argument flow…"
              />
              <textarea
                id="advThemes"
                name="advThemes"
                defaultValue={props.defaults.advThemes}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="Theological themes…"
              />
              <textarea
                id="advCrossRefs"
                name="advCrossRefs"
                defaultValue={props.defaults.advCrossRefs}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="Cross references / notes…"
              />
              <textarea
                id="advWordStudy"
                name="advWordStudy"
                defaultValue={props.defaults.advWordStudy}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="Word study…"
              />
              <textarea
                id="advCommentary"
                name="advCommentary"
                defaultValue={props.defaults.advCommentary}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
                placeholder="Commentary / questions…"
              />
            </div>
          </details>
        ) : null}

        <details className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <summary className="cursor-pointer text-sm font-semibold">Notes (optional)</summary>
          <div className="mt-4">
            <textarea
              name="notes"
              defaultValue={props.defaults.notes}
              rows={6}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </div>
        </details>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
