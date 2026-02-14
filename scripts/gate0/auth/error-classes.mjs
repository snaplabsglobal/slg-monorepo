/**
 * Auth Domain Error Classes
 *
 * SLG_Auth_Governance_v1 Section VII
 *
 * These error classes are specific to the Auth domain and define:
 * - What triggered the error
 * - Severity level
 * - Allowed file scope for fixes
 *
 * Integration: Will be merged into policy.json error_class_permissions
 * after the 30-day observation period.
 */

export const AUTH_ERROR_CLASSES = {
  /**
   * AUTH_ENV_MISMATCH
   * E2E pass but CEO fail; auth-target fingerprint mismatch
   */
  AUTH_ENV_MISMATCH: {
    severity: "P0",
    description:
      "E2E passed but CEO phone failed; auth-target fingerprint mismatch",
    signals: [
      "env_fingerprint different between CTO and CEO",
      "public_base_url different",
      "supabase_origin different",
    ],
    allowed_files: [
      "apps/*/app/api/_diag/**",
      "apps/*/middleware.ts",
      "apps/*/app/lib/auth/**",
    ],
    forbidden_files: ["packages/database/**", "infra/**", "billing/**"],
    cooldown_minutes: 120,
    max_attempts_24h: 2,
  },

  /**
   * AUTH_COOKIE_DROP
   * Login succeeds but Set-Cookie not persisted
   */
  AUTH_COOKIE_DROP: {
    severity: "P0",
    description: "Login request succeeds but Set-Cookie not persisted in browser",
    signals: [
      "cookies-after-login.json is empty",
      "HAR missing Set-Cookie header",
      "webkit fails but chromium passes",
    ],
    allowed_files: [
      "apps/*/app/lib/supabase-proxy/**",
      "apps/*/middleware.ts",
      "apps/*/app/lib/auth/**",
    ],
    forbidden_files: ["packages/database/**", "plansnap/**", "ledger/**"],
    cooldown_minutes: 120,
    max_attempts_24h: 2,
  },

  /**
   * AUTH_SESSION_NOT_PERSIST
   * Sign out visible after login but disappears on refresh
   */
  AUTH_SESSION_NOT_PERSIST: {
    severity: "P0",
    description: "Sign out visible after login but disappears on page refresh",
    signals: [
      "Screenshot 02-after-login shows Sign out",
      "Screenshot 03-after-refresh missing Sign out",
      "Cookie exists but server rejects",
      "Middleware redirects to /login",
    ],
    allowed_files: [
      "apps/*/middleware.ts",
      "apps/*/app/lib/auth/**",
      "apps/*/app/api/**",
    ],
    forbidden_files: ["infra/**", "billing/**"],
    cooldown_minutes: 120,
    max_attempts_24h: 2,
  },

  /**
   * AUTH_PROXY_ABORT_ERROR
   * AbortError from 127.0.0.1:54321 / undici abort
   */
  AUTH_PROXY_ABORT_ERROR: {
    severity: "P1",
    description: "AbortError from local Supabase or undici abort",
    signals: [
      "HAR shows aborted requests",
      "Console shows AbortError",
      "Intermittent failures",
    ],
    allowed_files: ["apps/*/app/lib/supabase-proxy/**", "scripts/**"],
    forbidden_files: ["database/**"],
    cooldown_minutes: 60,
    max_attempts_24h: 4,
  },
};

/**
 * Auth Domain Autonomy Levels
 *
 * SLG_Auth_Governance_v1 Section IX
 */
export const AUTH_AUTONOMY_LEVELS = {
  A: {
    name: "observe_only",
    description: "Diagnosis only, no modifications",
    allowed_actions: [
      "diagnose",
      "open_issue",
      "attach_evidence",
      "suggest_patch",
    ],
    forbidden_actions: ["merge", "modify_auth_config", "change_cookie_policy"],
  },
  B: {
    name: "safe_patch",
    description: "Propose patches with double audit",
    allowed_actions: [
      "propose_patch",
      "open_pr",
      "run_simulator",
      "double_audit",
    ],
    forbidden_actions: [
      "direct_merge",
      "widen_cookie_domain",
      "change_redirect_allowlist_without_proof_pack",
    ],
  },
  C: {
    name: "high_risk",
    description: "Requires CEO/CTO signoff",
    allowed_actions: [
      "prepare_migration_plan",
      "open_pr",
      "full_e2e_matrix",
      "attach_risk_report",
    ],
    forbidden_actions: [],
    requires_signoff: ["CEO", "CTO"],
  },
};

/**
 * Auth Domain Level Transition Rules
 */
export const AUTH_LEVEL_TRANSITIONS = {
  // P0 attempted >= 2 times in 24h -> downgrade to A
  downgrade_to_A: {
    condition: "p0_attempts >= 2 within 24h",
    action: "Set autonomy level to A (observe_only)",
  },
  // 3 consecutive webkit gate passes -> upgrade to B
  upgrade_to_B: {
    condition: "3 consecutive webkit gate passes",
    action: "Set autonomy level to B (safe_patch)",
  },
  // cookie_policy modified -> force to C
  force_to_C: {
    condition: "cookie_policy modification detected",
    action: "Force autonomy level to C (requires signoff)",
  },
};

/**
 * Format error class for display
 */
export function formatErrorClass(errorClass) {
  const ec = AUTH_ERROR_CLASSES[errorClass];
  if (!ec) return null;

  return {
    code: errorClass,
    severity: ec.severity,
    description: ec.description,
    signals: ec.signals,
    allowed_scope: ec.allowed_files,
    forbidden_scope: ec.forbidden_files,
    rate_limit: {
      cooldown_minutes: ec.cooldown_minutes,
      max_attempts_24h: ec.max_attempts_24h,
    },
  };
}

// CLI usage
if (process.argv[1].endsWith("error-classes.mjs")) {
  console.log("Auth Domain Error Classes");
  console.log("=========================");
  console.log();
  for (const [code, ec] of Object.entries(AUTH_ERROR_CLASSES)) {
    console.log(`${code} (${ec.severity})`);
    console.log(`  ${ec.description}`);
    console.log(`  Signals: ${ec.signals.join(", ")}`);
    console.log(`  Allowed: ${ec.allowed_files.join(", ")}`);
    console.log(`  Rate: ${ec.max_attempts_24h}/24h, ${ec.cooldown_minutes}min cooldown`);
    console.log();
  }
}
