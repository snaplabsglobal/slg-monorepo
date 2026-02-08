import * as React from "react";

export function Section(props: {
  id: string;
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { id, eyebrow, title, children, className = "" } = props;

  return (
    <section id={id} className={`scroll-mt-24 px-4 py-16 ${className}`}>
      <div className="mx-auto max-w-6xl">
        {eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            {eyebrow}
          </div>
        )}
        <h2 className="mt-2 text-2xl font-semibold text-gray-900 md:text-3xl">{title}</h2>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  );
}
