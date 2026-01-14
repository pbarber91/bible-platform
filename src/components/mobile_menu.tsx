"use client";

import { useEffect, useRef, useState } from "react";

type NavItem = { href: string; label: string };

export default function MobileMenu({
  title,
  items,
  authHref,
  authLabel,
}: {
  title: string;
  items: NavItem[];
  authHref: string;
  authLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!open) return;
      const el = rootRef.current;
      if (!el) return;
      const target = e.target as Node | null;
      if (target && !el.contains(target)) setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative sm:hidden" ref={rootRef}>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-800 hover:bg-slate-50"
      >
        {/* hamburger icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="px-4 py-3 text-xs text-slate-500">{title}</div>

          <nav className="grid">
            {items.map((it) => (
              <a
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                {it.label}
              </a>
            ))}
          </nav>

          <div className="my-1 h-px bg-slate-200" />

          <a
            href={authHref}
            onClick={() => setOpen(false)}
            className="block px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {authLabel}
          </a>
        </div>
      ) : null}
    </div>
  );
}
