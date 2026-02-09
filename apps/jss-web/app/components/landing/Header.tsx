"use client";

import * as React from "react";
import Image from "next/image";
import type { Lang, Copy } from "@/content/copy.types";
import { LanguageSwitch } from "./LanguageSwitch";

export function Header(props: {
  lang: Lang;
  copy: Copy;
  onLangChange: (lang: Lang) => void;
}) {
  const { lang, copy, onLangChange } = props;
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2">
          <Image
            src="/icons/jss-logo.svg"
            alt="JobSite Snap"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-gray-900">JobSite Snap</div>
            <div className="text-xs text-gray-500">SnapEvidence</div>
          </div>
        </a>

        {/* Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <nav className="mr-2 flex items-center gap-4 text-sm text-gray-600">
            <a href="#basement" className="hover:text-gray-900">Offline</a>
            <a href="#failures" className="hover:text-gray-900">Reliability</a>
            <a href="#smart-trace" className="hover:text-gray-900">Smart Trace</a>
            <a href="#self-rescue" className="hover:text-gray-900">Self-Rescue</a>
          </nav>

          <LanguageSwitch lang={lang} onChange={onLangChange} variant="desktop" />

          <a
            href="/login"
            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
          >
            Login
          </a>

          <a
            href="#cta"
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            {copy.hero.cta}
          </a>
        </div>

        {/* Mobile */}
        <div className="md:hidden">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            Menu
          </button>
        </div>
      </div>

      {/* Mobile panel */}
      {open && (
        <div id="mobile-menu" className="border-t border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4">
            <nav className="flex flex-col gap-2 text-sm">
              <a onClick={() => setOpen(false)} href="#basement" className="py-1 text-gray-700">
                Offline
              </a>
              <a onClick={() => setOpen(false)} href="#failures" className="py-1 text-gray-700">
                Reliability
              </a>
              <a onClick={() => setOpen(false)} href="#smart-trace" className="py-1 text-gray-700">
                Smart Trace
              </a>
              <a onClick={() => setOpen(false)} href="#self-rescue" className="py-1 text-gray-700">
                Self-Rescue
              </a>
            </nav>

            <div className="pt-2">
              <LanguageSwitch lang={lang} onChange={onLangChange} variant="mobile" />
            </div>

            <a
              onClick={() => setOpen(false)}
              href="/login"
              className="mt-1 inline-flex items-center justify-center rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700"
            >
              Login
            </a>

            <a
              onClick={() => setOpen(false)}
              href="#cta"
              className="mt-1 inline-flex items-center justify-center rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white"
            >
              {copy.hero.cta}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
