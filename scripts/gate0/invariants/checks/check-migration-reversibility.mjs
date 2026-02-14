/**
 * Tier-0 Check: Migration Reversibility
 * Document: SLG_SnapOps_CTO_Implementation_Guide_v1 §4.4
 *
 * Rules:
 * - New migrations should have down/rollback capability (warning for now)
 * - Irreversible migrations require Level 3 approval (constitutional)
 *
 * Note: v1 starts as skipped if migrations not configured.
 * Full sandbox up→down→up verification is TODO for v2.
 */
import fs from "node:fs";
import path from "node:path";

export async function checkMigrationReversibility(baseDb, currDb) {
  // Skip if migrations not enabled
  if (!currDb?.migrationsEnabled) {
    return {
      rule: "migration_reversibility",
      violations: [],
      warnings: [{ rule: "migration_reversibility", message: "migrations_not_configured" }],
      skipped: true,
    };
  }

  const violations = [];
  const warnings = [];

  // Get new migrations
  const baseMigrations = baseDb?.migrations || [];
  const currMigrations = currDb?.migrations || [];
  const newMigrations = currMigrations.filter(m => !baseMigrations.includes(m));

  for (const m of newMigrations) {
    warnings.push({
      rule: "migration_reversibility",
      kind: "new_migration_detected",
      migration: m,
    });

    // TODO: Check for down migration or rollback capability
    // For Supabase: migrations are typically up-only
    // For Prisma: check for corresponding down migration
    //
    // v1: Just warn about new migrations
    // v2: Implement sandbox up→down→up verification
  }

  // Check for removed migrations (should never happen)
  const removedMigrations = baseMigrations.filter(m => !currMigrations.includes(m));
  for (const m of removedMigrations) {
    violations.push({
      tier: 0,
      rule: "migration_reversibility",
      kind: "migration_removed",
      migration: m,
      severity: "constitutional",
    });
  }

  return {
    rule: "migration_reversibility",
    violations,
    warnings,
    skipped: false,
  };
}
