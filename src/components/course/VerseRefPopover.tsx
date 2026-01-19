// src/components/course/VerseRefPopover.tsx
"use client";

import * as React from "react";

type VersePayload = {
  reference: string;
  text: string;
  citation?: string;
};

export type VerseRefPopoverProps = {
  reference: string;

  /** Server action: fetch NIV text for the reference (runs only on click). */
  fetchVerseAction: (reference: string) => Promise<VersePayload>;

  /**
   * Server action: create (or reuse) the course “General” study plan + a new session
   * with this verse reference as the passage, then return the editor URL to redirect to.
   */
  addToStudySessionAction: (reference: string) => Promise<{ href: string }>;

  className?: string;
};

function clampText(s: string, max = 900) {
  const v = (s || "").trim();
  if (v.length <= max) return v;
  return v.slice(0, max).trimEnd() + "…";
}

export function VerseRefPopover({
  reference,
  fetchVerseAction,
  addToStudySessionAction,
  className,
}: VerseRefPopoverProps) {
  const ref = (reference || "").trim();

  const [open, setOpen] = React.useState(false);
  const [loading, startTransition] = React.useTransition();
  const [payload, setPayload] = React.useState<VersePayload | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function openPopover() {
    if (!ref) return;
    setOpen(true);

    // Fetch only the first time we open (or if it previously errored).
    if (payload && !error) return;

    setError(null);
    startTransition(async () => {
      try {
        const r = await fetchVerseAction(ref);
        setPayload({
          reference: (r?.reference || ref).trim(),
          text: clampText(String(r?.text || "")),
          citation: typeof r?.citation === "string" ? r.citation : undefined,
        });
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Failed to fetch verse text.");
      }
    });
  }

  function closePopover() {
    setOpen(false);
  }

  function handleAddToStudy() {
    if (!ref) return;
    setError(null);

    startTransition(async () => {
      try {
        const r = await addToStudySessionAction(ref);
        if (r?.href) window.location.href = r.href;
      } catch (e: any) {
        setError(e?.message ? String(e.message) : "Failed to create a study session.");
      }
    });
  }

  return (
    <span className={className}>
      <button
        type="button"
        onClick={openPopover}
        className="inline-flex items-center rounded-md px-1.5 py-0.5 text-sm font-semibold text-slate-800 underline decoration-slate-300 decoration-2 underline-offset-4 hover:text-slate-900 hover:decoration-slate-500"
        title="Click to preview NIV text"
      >
        {ref}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" onClick={closePopover} role="presentation">
          <div className="absolute inset-0 bg-black/30" />

          <div
            className="absolute left-1/2 top-1/2 w-[min(720px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-200"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  NIV preview: {payload?.reference || ref}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Click “Add to study session” to push this reference into your editor.
                </div>
              </div>

              <button
                type="button"
                onClick={closePopover}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              {loading && !payload ? (
                <div className="text-sm text-slate-700">Loading…</div>
              ) : error ? (
                <div className="text-sm text-rose-700">{error}</div>
              ) : payload?.text ? (
                <div className="whitespace-pre-wrap text-sm text-slate-800">{payload.text}</div>
              ) : (
                <div className="text-sm text-slate-700">No text returned.</div>
              )}

              {payload?.citation ? (
                <div className="mt-3 text-xs text-slate-500">{payload.citation}</div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleAddToStudy}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Working…" : "Add to study session"}
              </button>

              <a
                href={`https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=NIV`}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Open on BibleGateway
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </span>
  );
}
