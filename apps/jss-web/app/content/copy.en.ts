import type { Copy } from "./copy.types";

/**
 * Official Marketing Copy (English)
 *
 * Source: 260207_JSS销售话术与营销完整方案_CompanyCam差异化定位.md
 *
 * Core positioning:
 * "CompanyCam tries to be helpful by being automatic.
 *  JSS tries to be trustworthy by being explicit."
 */
export const copyEn: Copy = {
  hero: {
    h1: "Jobsite photos you can trust—even when everything goes wrong.",
    h2: "Offline-first jobsite documentation. Suggestions only. Nothing moves unless you approve.",
    value: "Offline-first · Suggestions only\nNothing moves unless you approve",
    stance: "Most jobsite photo apps focus on convenience. JSS focuses on control.",
    bullets: [
      {
        title: "Offline-first by design",
        desc: "Photos are written locally first. Uploads run in the background. Your camera never blocks."
      },
      {
        title: "Suggestions only",
        desc: "Nothing is applied without confirmation. Every change is reviewable and reversible."
      },
      {
        title: "Company owns the photos",
        desc: "Staff capture; owners control. Access revokes instantly when someone leaves."
      }
    ],
    cta: "Try Self-Rescue"
  },

  basement: {
    h2: "Job sites don't have perfect signal. Your camera shouldn't depend on it.",
    body: [
      "Basements drop signal. Concrete kills reception. Inspections don't wait.",
      "JSS writes every photo locally first. Uploads run in the background. Your camera never blocks."
    ],
    compare: {
      other: "Other apps: Photos are queued for upload. When sync breaks, you don't know what was saved.",
      jss: "JSS: The shot already counts. Upload failure is a state — not a loss."
    },
    anchor: "If the signal dies, your evidence doesn't."
  },

  failures: {
    title: "Where jobsite photo tools usually fail",
    cases: [
      {
        title: "Uploads get stuck",
        subtitle: "You took the photos. You assumed they synced. They didn't.",
        reason: [
          "Photos tied to upload queue",
          "Retry failures go unnoticed",
          "No clear failure signal"
        ],
        jss: "JSS writes locally first. Upload never blocks capture."
      },
      {
        title: "History reorganizes itself",
        subtitle: "Photos move automatically. You notice months later. Now nothing lines up.",
        reason: [
          "Silent auto-organization",
          "Changes happen continuously",
          "Fixing mistakes means manual cleanup"
        ],
        jss: "JSS: Suggestions only. Nothing is applied without confirmation."
      },
      {
        title: "Evidence turns into noise",
        subtitle: "Hundreds of photos. No order. No clear answer for inspectors.",
        reason: [
          "Great for progress sharing",
          "Not designed for formal evidence",
          "No structured delivery"
        ],
        jss: "JSS: Photos are structured into Evidence Sets. Clear timelines, read-only delivery."
      }
    ],
    summary: "These aren't edge cases. They're why contractors lose time — and arguments."
  },

  smartTrace: {
    h2: "Smart Trace remembers. You decide.",
    body: [
      "When you take photos offline, JSS remembers location and time.",
      "Later, it connects the dots — carefully.",
      "Not by guessing. Not by changing anything behind your back.",
      "Just a clear suggestion, waiting for you."
    ],
    uiExample: "Photos taken near: West 41st Ave Project (42m)",
    note: "Nothing happens until you tap.",
    anchor: "In JSS, the system can suggest. Only you can decide."
  },

  selfRescue: {
    h2: "Fix the past — safely",
    subhead: "Before asking you to trust new photos, JSS helps you clean up the old ones.",
    body: [
      "Most contractors already have years of jobsite photos — scattered across phones, apps, and folders.",
      "Self-Rescue Mode helps you organize them by location and time.",
      "If JSS can't earn your trust with your old photos, it doesn't deserve your new ones."
    ],
    steps: [
      {
        title: "Filters personal & travel photos",
        desc: "We automatically exclude what's clearly not jobsite work."
      },
      {
        title: "Groups likely jobs conservatively",
        desc: "Suggested groupings based on location. You review everything."
      },
      {
        title: "Never applies changes without review",
        desc: "You stay in control. Apply once, undo anytime."
      }
    ],
    trustAnchor: "Suggestions only. You stay in control.",
    cta: "Try Self-Rescue"
  },

  whySwitch: {
    quotes: [
      "It doesn't surprise me later.",
      "Inspectors stop asking follow-up questions.",
      "I finally trust my photo record."
    ],
    summary: "CompanyCam tries to be helpful by being automatic. JSS tries to be trustworthy by being explicit. That's why contractors switch — not for more features, but for fewer surprises.",
    cta: "Try Self-Rescue"
  }
};
