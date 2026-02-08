import type { Copy } from "./copy.types";

export const copyEn: Copy = {
  hero: {
    h1: "The jobsite camera that works when everything else doesn't.",
    h2: "Built for basements, bad signal, and real job sites — not offices with Wi-Fi.",
    value: "No signal? Still counts.\nShot taken = evidence saved.",
    stance: "Most apps assume you have internet. JSS assumes you don't.",
    bullets: [
      {
        title: "Offline-first by design",
        desc: "Photos are saved locally first. Upload never blocks the shot."
      },
      {
        title: "Camera-grade reliability",
        desc: "If it's written to the device, it's real. Period."
      },
      {
        title: "No silent automation",
        desc: "We don't move, rename, or reassign your photos without you."
      }
    ],
    cta: "Try it where Wi-Fi dies"
  },

  basement: {
    h2: "Basement. No signal. Still counts.",
    body: [
      "You're in a basement. Concrete walls. No bars. No Wi-Fi.",
      "You take photos because you have to — progress, changes, proof.",
      "With most apps, this is where things get risky.",
      "With JSS, this is where it just works."
    ],
    compare: {
      other: "Other apps: You hope it saved.",
      jss: "JSS: The shot already counts."
    },
    anchor: "If it's written to the device, it's evidence — even underground."
  },

  failures: {
    title: "When photos fail, it's never obvious. Until it's too late.",
    cases: [
      {
        title: "Upload stuck",
        subtitle: "You thought it synced. It didn't.",
        reason: [
          "Photos tied to upload",
          "Retry queues get stuck",
          "No clear failure signal"
        ],
        jss: "JSS saves first. Upload failure is a state — not a loss."
      },
      {
        title: "Wrong project",
        subtitle: "The system 'helped' — and guessed wrong.",
        reason: [
          "Silent auto-archiving",
          "No explicit confirmation",
          "One mistake breaks trust"
        ],
        jss: "JSS never auto-assigns in Phase 1. You always confirm."
      },
      {
        title: "Lost evidence",
        subtitle: "Uninstall = gone forever.",
        reason: [
          "No system gallery",
          "Unclear upload state",
          "False sense of safety"
        ],
        jss: "JSS clearly shows what's saved and what's not."
      }
    ],
    summary: "Failure doesn't happen when you take the photo. It happens when you think you're done."
  },

  smartTrace: {
    h2: "Smart Trace remembers. You decide.",
    body: [
      "You take photos offline.",
      "Later, JSS connects the dots — carefully.",
      "Not by guessing. Not by changing anything behind your back.",
      "Just a clear suggestion, waiting for you."
    ],
    uiExample: "Photos taken near: West 41st Ave Project (42m)",
    note: "Nothing happens until you tap.",
    anchor: "If you didn't decide it, it didn't change."
  },

  selfRescue: {
    h2: "Fix your photo mess — before switching tools",
    subhead: "Organize years of jobsite photos by location and time. Nothing changes unless you confirm.",
    body: [
      "Most contractors don't need a new app.",
      "They need their photos back under control.",
      "Same building. Multiple units. Quick estimates mixed into real work.",
      "Self-Rescue Mode lets you clean this up — safely."
    ],
    steps: [
      {
        title: "1. Scan (read-only)",
        desc: "We read time & location. No changes."
      },
      {
        title: "2. Review & fix",
        desc: "Grouped by building and work sessions. You decide what goes where."
      },
      {
        title: "3. Confirm",
        desc: "Apply once. Undo anytime."
      }
    ],
    trustAnchor: "Suggestions only. Nothing changes unless you confirm.",
    cta: "Start Self-Rescue"
  },

  whySwitch: {
    quotes: [
      "I stopped worrying if the photo actually saved.",
      "It doesn't try to be smart behind my back.",
      "I trust it when things go wrong — not when everything's perfect."
    ],
    summary: "People don't switch tools because of features. They switch because of trust.",
    cta: "Try JSS where Wi-Fi dies"
  }
};
