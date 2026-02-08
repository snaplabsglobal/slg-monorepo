export type Lang = "en" | "zh";

export type Copy = {
  hero: {
    h1: string;
    h2: string;
    value: string;
    stance: string;
    bullets: Array<{ title: string; desc: string }>;
    cta: string;
  };
  basement: {
    h2: string;
    body: string[];
    compare: { other: string; jss: string };
    anchor: string;
  };
  failures: {
    title: string;
    cases: Array<{
      title: string;
      subtitle: string;
      reason: string[];
      jss: string;
    }>;
    summary: string;
  };
  smartTrace: {
    h2: string;
    body: string[];
    uiExample: string;
    note: string;
    anchor: string;
  };
  whySwitch: {
    quotes: string[];
    summary: string;
    cta: string;
  };
};
