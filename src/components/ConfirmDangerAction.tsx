// src/components/ConfirmDangerAction.tsx
"use client";

import * as React from "react";

type Props = {
  /** Button label shown in the page (e.g. "Delete"). */
  buttonLabel: string;

  /** Modal title. */
  title: string;

  /** Modal body text. */
  message: string;

  /** Server action already bound to any needed ids (must take no args). */
  action: () => void | Promise<void>;

  /** Optional extra warning line. */
  dangerHint?: string;

  /** Optional: disable button. */
  disabled?: boolean;
};

export function ConfirmDangerAction({
  buttonLabel,
  title,
  message,
  action,
  dangerHint,
  disabled,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);

  function close() {
    setOpen(false);
  }

  function confirm() {
    // Submit the server action form
    try {
      formRef.current?.requestSubmit();
    } catch {
      // Fallback
      formRef.current?.submit();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
      >
        {buttonLabel}
      </button>

      {/* Hidden server-action form */}
      <form ref={formRef} action={action} className="hidden">
        <button type="submit" />
      </form>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold tracking-tight text-slate-900">{title}</div>
                <div className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{message}</div>
                {dangerHint ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    {dangerHint}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={close}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm}
                className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
