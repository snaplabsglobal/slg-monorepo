"use client";

import * as React from "react";
import type { Lang } from "@/content/copy.types";

const LS_KEY = "jss_lang";

export function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LS_KEY);
  if (stored === "en" || stored === "zh") return stored;
  return "en"; // default English (no auto-detect)
}

export function persistLang(lang: Lang) {
  try {
    window.localStorage.setItem(LS_KEY, lang);
  } catch {
    // ignore
  }
}

export function LanguageSwitch(props: {
  lang: Lang;
  onChange: (lang: Lang) => void;
  variant?: "desktop" | "mobile";
}) {
  const { lang, onChange } = props;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 text-sm">
      <button
        type="button"
        className={lang === "en" ? "font-semibold text-gray-900" : "text-gray-500 hover:text-gray-700"}
        onClick={() => onChange("en")}
        aria-pressed={lang === "en"}
      >
        EN
      </button>
      <span className="text-gray-300">|</span>
      <button
        type="button"
        className={lang === "zh" ? "font-semibold text-gray-900" : "text-gray-500 hover:text-gray-700"}
        onClick={() => onChange("zh")}
        aria-pressed={lang === "zh"}
      >
        中文
      </button>
    </div>
  );
}
