"use client";

import * as React from "react";
import type { Lang } from "@/content/copy.types";
import { copyEn } from "@/content/copy.en";
import { copyZh } from "@/content/copy.zh";
import { getInitialLang, persistLang } from "./LanguageSwitch";
import { Header } from "./Header";
import { Section } from "./Section";

function useSmoothScroll() {
  return React.useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
}

export default function LandingPage() {
  const [lang, setLang] = React.useState<Lang>("en");
  const scrollTo = useSmoothScroll();

  React.useEffect(() => {
    setLang(getInitialLang());
  }, []);

  const copy = lang === "en" ? copyEn : copyZh;

  const onLangChange = (l: Lang) => {
    setLang(l);
    persistLang(l);
  };

  return (
    <div id="top" className="min-h-screen bg-white text-gray-900">
      <Header lang={lang} copy={copy} onLangChange={onLangChange} />

      <main>
        {/* HERO */}
        <section className="px-4">
          <div className="mx-auto grid min-h-[calc(100vh-56px)] max-w-6xl items-center py-10 md:py-16">
            <div className="max-w-3xl">
              <h1 className="text-4xl font-semibold leading-tight text-gray-900 md:text-6xl">
                {copy.hero.h1}
              </h1>

              <p className="mt-5 text-lg text-gray-600 md:text-xl">
                {copy.hero.h2}
              </p>

              <div className="mt-6 whitespace-pre-line rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-gray-800 md:text-base">
                {copy.hero.value}
              </div>

              <p className="mt-4 text-sm text-gray-600 md:text-base">
                {copy.hero.stance}
              </p>

              <div className="mt-7 grid gap-3 md:grid-cols-3">
                {copy.hero.bullets.map((b) => (
                  <div key={b.title} className="rounded-2xl border border-gray-200 p-4">
                    <div className="text-sm font-semibold text-gray-900">{b.title}</div>
                    <div className="mt-1 text-sm text-gray-600">{b.desc}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3" id="cta">
                <button
                  type="button"
                  className="rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600"
                  onClick={() => scrollTo("basement")}
                >
                  {copy.hero.cta}
                </button>

                <button
                  type="button"
                  className="rounded-full px-5 py-3 text-sm font-semibold text-gray-500 hover:text-gray-700"
                  onClick={() => scrollTo("basement")}
                >
                  Scroll
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* BASEMENT */}
        <Section
          id="basement"
          title={copy.basement.h2}
          eyebrow="Real jobsite scenario"
          className="border-t border-gray-200 bg-gray-50"
        >
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-3">
              {copy.basement.body.map((p) => (
                <p key={p} className="text-sm text-gray-700 md:text-base">
                  {p}
                </p>
              ))}

              <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-semibold text-red-600">
                  {copy.basement.compare.other}
                </div>
                <div className="mt-1 text-sm font-semibold text-green-600">
                  {copy.basement.compare.jss}
                </div>
              </div>

              <div className="mt-5 text-sm font-semibold text-gray-900">
                {copy.basement.anchor}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="text-sm font-semibold text-gray-900">Basement Scene</div>
              <div className="mt-2 text-sm text-gray-500">
                Real basement photo placeholder
              </div>
              <div className="mt-6 h-48 rounded-2xl bg-gray-800 flex items-center justify-center">
                <svg className="h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
        </Section>

        {/* FAILURES */}
        <Section
          id="failures"
          title={copy.failures.title}
          eyebrow="Common failure modes"
          className="border-t border-gray-200"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {copy.failures.cases.map((c) => (
              <div key={c.title} className="rounded-3xl border border-gray-200 p-5">
                <div className="text-sm font-semibold text-red-600">{c.title}</div>
                <div className="mt-1 text-sm text-gray-600">{c.subtitle}</div>

                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-600">
                  {c.reason.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>

                <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm">
                  <div className="font-semibold text-green-700">JSS</div>
                  <div className="mt-1 text-green-600">{c.jss}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm font-semibold text-gray-800">
            {copy.failures.summary}
          </div>
        </Section>

        {/* SMART TRACE */}
        <Section
          id="smart-trace"
          title={copy.smartTrace.h2}
          eyebrow="Helps — never decides"
          className="border-t border-gray-200 bg-gray-50"
        >
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-3">
              {copy.smartTrace.body.map((p) => (
                <p key={p} className="text-sm text-gray-700 md:text-base">
                  {p}
                </p>
              ))}

              <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                <div className="text-sm font-semibold text-gray-900">
                  {copy.smartTrace.uiExample}
                </div>
                <div className="mt-3 flex gap-2">
                  <button className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
                    Confirm
                  </button>
                  <button className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:border-gray-300">
                    Not this job
                  </button>
                </div>
                <div className="mt-3 text-sm text-gray-500">
                  {copy.smartTrace.note}
                </div>
              </div>

              <div className="mt-5 text-sm font-semibold text-gray-900">
                {copy.smartTrace.anchor}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6">
              <div className="text-sm font-semibold text-gray-900">Smart Trace Preview</div>
              <div className="mt-2 text-sm text-gray-500">
                UI mock placeholder
              </div>
              <div className="mt-6 h-48 rounded-2xl bg-gray-100 flex items-center justify-center">
                <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
          </div>
        </Section>

        {/* WHY SWITCH */}
        <Section
          id="why-switch"
          title="Why contractors switch"
          eyebrow="Real words"
          className="border-t border-gray-200"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {copy.whySwitch.quotes.map((q) => (
              <div key={q} className="rounded-3xl border border-gray-200 p-6 text-sm font-semibold text-gray-800">
                &ldquo;{q}&rdquo;
              </div>
            ))}
          </div>

          <div className="mt-10 text-sm text-gray-700 md:text-base">
            {copy.whySwitch.summary}
          </div>

          <div className="mt-6">
            <a
              href="#top"
              className="inline-flex rounded-full bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600"
            >
              {copy.whySwitch.cta}
            </a>
          </div>
        </Section>

        <footer className="border-t border-gray-200 px-4 py-10">
          <div className="mx-auto max-w-6xl text-sm text-gray-500">
            &copy; {new Date().getFullYear()} JobSite Snap. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
}
