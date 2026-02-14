/**
 * Domain Path Configuration
 * Document: SLG_SnapOps_CTO_Implementation_Guide_v1 §3.2
 *
 * Defines constitutional files and domain path rules for GDR classification.
 */

export const CONSTITUTIONAL_FILES = new Set([
  "policy.json",
  "scripts/gate0/policy.mjs",
  "scripts/gate0/risk.mjs",
  "scripts/gate0/whitelist.mjs",
  "scripts/gate0/suspend.mjs",
  "scripts/gate0/invariant_check.mjs",
  "governance/baseline.signature.json",
]);

export const DOMAIN_PATH_RULES = {
  event: [
    ".gate0-telemetry/",
    "apps/jss-web/app/lib/telemetry/",
    "apps/jss-web/app/lib/telemetry.ts",
  ],
  state: [
    "apps/jss-web/app/lib/snap-evidence/types.ts",
    "apps/jss-web/app/lib/snap-evidence/",
    "apps/jss-web/app/lib/upload-queue/",
  ],
  migration: [
    "supabase/migrations/",
    "database/migrations/",
    "prisma/migrations/",
    "prisma/schema.prisma",
  ],
  api_surface: [
    "packages/",
  ],
};

/**
 * Source of Truth paths (filled per §1.1)
 */
export const SOURCE_OF_TRUTH = {
  event_schema: ".gate0-telemetry/events.jsonl",
  state_machine: "apps/jss-web/app/lib/snap-evidence/types.ts",
  migrations: "supabase/migrations/",
};
