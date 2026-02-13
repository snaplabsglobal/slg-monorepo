#!/usr/bin/env node
/**
 * Gate0 Invariant Check v1.0
 * ============================================================================
 * Document: SLG_Governance_Constitution_v1.0-final §五
 *
 * Tier-0 Invariant Checks:
 *   1. Event Schema Immutability - No field deletions or type changes
 *   2. State Machine Monotonicity - No backward state transitions (future)
 *   3. Migration Reversibility - Migrations must have down functions (future)
 *
 * Returns severity levels: warning | major | constitutional
 *
 * Usage:
 *   node scripts/gate0/invariant_check.mjs --event-schema
 *   node scripts/gate0/invariant_check.mjs --create-baseline
 * ============================================================================
 */
import fs from 'node:fs'
import path from 'node:path'

// ============================================================================
// LOAD POLICY
// ============================================================================

const POLICY_PATH = path.resolve(process.cwd(), 'policy.json')
const BASELINE_DIR = path.resolve(process.cwd(), 'out/state/baselines')

let policy
try {
  policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'))
} catch (err) {
  console.error('ERROR: Cannot load policy.json:', err.message)
  process.exit(1)
}

const SEVERITY_MAPPING = policy.invariant_test_suite?.tier0?.severity_mapping || {
  field_added_without_baseline_update: 'warning',
  migration_missing_down: 'major',
  state_added_without_handler: 'major',
  field_deleted: 'constitutional',
  field_type_changed: 'constitutional',
  state_backward_transition: 'constitutional',
  silent_data_loss: 'constitutional'
}

// ============================================================================
// EVENT SCHEMA BASELINE
// ============================================================================

/**
 * Path to the event schema baseline file
 */
const EVENT_SCHEMA_BASELINE_PATH = path.join(BASELINE_DIR, 'event-schema.json')

/**
 * Extract schema from JSONL telemetry files
 * Returns a map of field names to their types
 */
function extractSchemaFromJsonl(jsonlPath) {
  const schema = new Map()

  if (!fs.existsSync(jsonlPath)) {
    return schema
  }

  const content = fs.readFileSync(jsonlPath, 'utf8')
  const lines = content.split('\n').filter(Boolean)

  for (const line of lines) {
    try {
      const obj = JSON.parse(line)
      extractFieldTypes(obj, '', schema)
    } catch {
      // Skip malformed lines
    }
  }

  return schema
}

/**
 * Recursively extract field types from an object
 */
function extractFieldTypes(obj, prefix, schema) {
  if (obj === null || obj === undefined) return

  for (const [key, value] of Object.entries(obj)) {
    const fieldPath = prefix ? `${prefix}.${key}` : key
    const valueType = getType(value)

    if (!schema.has(fieldPath)) {
      schema.set(fieldPath, new Set())
    }
    schema.get(fieldPath).add(valueType)

    // Recurse into objects
    if (valueType === 'object' && value !== null) {
      extractFieldTypes(value, fieldPath, schema)
    }
  }
}

/**
 * Get the type of a value (more specific than typeof)
 */
function getType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/**
 * Create baseline from current telemetry
 */
function createBaseline() {
  const telemetryDir = path.resolve(process.cwd(), '.gate0-telemetry')

  if (!fs.existsSync(telemetryDir)) {
    console.error('ERROR: No .gate0-telemetry directory found')
    process.exit(1)
  }

  const schema = new Map()

  // Find all .jsonl files
  const files = fs.readdirSync(telemetryDir).filter(f => f.endsWith('.jsonl'))

  for (const file of files) {
    const filePath = path.join(telemetryDir, file)
    const fileSchema = extractSchemaFromJsonl(filePath)

    // Merge into main schema
    for (const [field, types] of fileSchema) {
      if (!schema.has(field)) {
        schema.set(field, new Set())
      }
      for (const type of types) {
        schema.get(field).add(type)
      }
    }
  }

  // Convert to serializable format
  const baselineObj = {
    version: '1.0.0',
    created_at: new Date().toISOString(),
    source_files: files,
    fields: {}
  }

  for (const [field, types] of schema) {
    baselineObj.fields[field] = [...types].sort()
  }

  // Ensure directory exists
  fs.mkdirSync(BASELINE_DIR, { recursive: true })

  // Write baseline
  fs.writeFileSync(EVENT_SCHEMA_BASELINE_PATH, JSON.stringify(baselineObj, null, 2))

  console.log(`Baseline created at ${EVENT_SCHEMA_BASELINE_PATH}`)
  console.log(`Fields: ${Object.keys(baselineObj.fields).length}`)
  console.log(`Source files: ${files.length}`)

  return baselineObj
}

/**
 * Load the baseline schema
 */
function loadBaseline() {
  if (!fs.existsSync(EVENT_SCHEMA_BASELINE_PATH)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(EVENT_SCHEMA_BASELINE_PATH, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Check current schema against baseline
 * Returns { passed: boolean, severity: string, violations: array }
 */
function checkEventSchema() {
  const baseline = loadBaseline()

  if (!baseline) {
    return {
      passed: true,
      severity: null,
      rule: 'event_immutability',
      detail: 'No baseline found. Run --create-baseline first.',
      action: 'none'
    }
  }

  // Extract current schema
  const telemetryDir = path.resolve(process.cwd(), '.gate0-telemetry')
  if (!fs.existsSync(telemetryDir)) {
    return {
      passed: true,
      severity: null,
      rule: 'event_immutability',
      detail: 'No telemetry directory found. Skipping check.',
      action: 'none'
    }
  }

  const currentSchema = new Map()
  const files = fs.readdirSync(telemetryDir).filter(f => f.endsWith('.jsonl'))

  for (const file of files) {
    const filePath = path.join(telemetryDir, file)
    const fileSchema = extractSchemaFromJsonl(filePath)
    for (const [field, types] of fileSchema) {
      if (!currentSchema.has(field)) {
        currentSchema.set(field, new Set())
      }
      for (const type of types) {
        currentSchema.get(field).add(type)
      }
    }
  }

  const violations = []
  let maxSeverity = null

  // Check for deleted fields (constitutional)
  for (const field of Object.keys(baseline.fields)) {
    if (!currentSchema.has(field)) {
      violations.push({
        type: 'field_deleted',
        field,
        baseline_types: baseline.fields[field],
        current_types: null,
        severity: SEVERITY_MAPPING.field_deleted
      })

      if (!maxSeverity || severityRank(SEVERITY_MAPPING.field_deleted) > severityRank(maxSeverity)) {
        maxSeverity = SEVERITY_MAPPING.field_deleted
      }
    }
  }

  // Check for type changes (constitutional)
  for (const field of Object.keys(baseline.fields)) {
    if (currentSchema.has(field)) {
      const baselineTypes = new Set(baseline.fields[field])
      const currentTypes = currentSchema.get(field)

      // Check if any baseline type is missing
      for (const type of baselineTypes) {
        if (!currentTypes.has(type)) {
          violations.push({
            type: 'field_type_changed',
            field,
            baseline_types: [...baselineTypes],
            current_types: [...currentTypes],
            severity: SEVERITY_MAPPING.field_type_changed
          })

          if (!maxSeverity || severityRank(SEVERITY_MAPPING.field_type_changed) > severityRank(maxSeverity)) {
            maxSeverity = SEVERITY_MAPPING.field_type_changed
          }
          break
        }
      }
    }
  }

  // Check for new fields (warning)
  for (const [field, types] of currentSchema) {
    if (!baseline.fields[field]) {
      violations.push({
        type: 'field_added_without_baseline_update',
        field,
        baseline_types: null,
        current_types: [...types],
        severity: SEVERITY_MAPPING.field_added_without_baseline_update
      })

      if (!maxSeverity || severityRank(SEVERITY_MAPPING.field_added_without_baseline_update) > severityRank(maxSeverity)) {
        maxSeverity = SEVERITY_MAPPING.field_added_without_baseline_update
      }
    }
  }

  const blocksCommit = maxSeverity === 'constitutional' || maxSeverity === 'major'

  return {
    passed: violations.length === 0 || !blocksCommit,
    severity: maxSeverity,
    rule: 'event_immutability',
    violations,
    detail: violations.length === 0
      ? 'Event schema unchanged'
      : `${violations.length} violation(s) found`,
    action: getAction(maxSeverity)
  }
}

/**
 * Get severity rank for comparison
 */
function severityRank(severity) {
  switch (severity) {
    case 'constitutional': return 3
    case 'major': return 2
    case 'warning': return 1
    default: return 0
  }
}

/**
 * Get action based on severity
 */
function getAction(severity) {
  switch (severity) {
    case 'constitutional':
      return 'downgrade_to_A_suspend_ceo_unlock'
    case 'major':
      return 'immediate_downgrade_cto_unlock'
    case 'warning':
      return 'log_and_alert'
    default:
      return 'none'
  }
}

// ============================================================================
// GDR (GOVERNANCE DIFF REPORT) LEVEL DETERMINATION
// Document: SLG_SnapOps_Operational_Launch_v1.1 §四
// ============================================================================

/**
 * Determine GDR Level based on diff analysis
 * Level 0: Normal change (no state/schema/migration/packages)
 * Level 1: Append-only (new fields/states/migration with down)
 * Level 2: Structural change (type change/transition change/packages API/breaking)
 * Level 3: Constitutional (field delete/state delete/irreversible migration/audit chain)
 *
 * @param {object} diff - Diff analysis result
 * @returns {{ level: number, reason: string, required_approver: string|string[]|null, gdr_required: boolean }}
 */
function determineGDRLevel(diff) {
  // Level 3: Constitutional changes
  if (diff.constitutional_files_touched) {
    return {
      level: 3,
      reason: 'Constitutional files modified',
      required_approver: ['CEO', 'CTO'],
      gdr_required: true,
      auto_suspend: true
    }
  }

  if (diff.fields_deleted || diff.states_deleted || diff.migration_irreversible) {
    return {
      level: 3,
      reason: diff.fields_deleted ? 'Fields deleted' :
              diff.states_deleted ? 'States deleted' :
              'Irreversible migration',
      required_approver: ['CEO', 'CTO'],
      gdr_required: true,
      auto_suspend: true
    }
  }

  // Level 2: Structural changes
  if (diff.field_type_changed || diff.transition_rules_changed ||
      diff.packages_api_changed || diff.breaking_change) {
    return {
      level: 2,
      reason: diff.field_type_changed ? 'Field type changed' :
              diff.transition_rules_changed ? 'State transition rules changed' :
              diff.packages_api_changed ? 'packages/** API changed' :
              'Breaking change detected',
      required_approver: 'CTO',
      gdr_required: true,
      auto_suspend: false
    }
  }

  // Level 1: Append-only changes
  if (diff.fields_added || diff.states_added || diff.migration_with_down) {
    return {
      level: 1,
      reason: diff.fields_added ? 'Fields added' :
              diff.states_added ? 'States added' :
              'New migration with down function',
      required_approver: null,
      gdr_required: true,
      gdr_mode: 'auto_generated',
      auto_suspend: false
    }
  }

  // Level 0: Normal change
  return {
    level: 0,
    reason: 'No structural changes detected',
    required_approver: null,
    gdr_required: false,
    auto_suspend: false
  }
}

/**
 * Analyze changed files and determine diff characteristics
 */
function analyzeDiff(changedFiles) {
  const diff = {
    constitutional_files_touched: false,
    fields_deleted: false,
    fields_added: false,
    field_type_changed: false,
    states_deleted: false,
    states_added: false,
    transition_rules_changed: false,
    migration_irreversible: false,
    migration_with_down: false,
    packages_api_changed: false,
    breaking_change: false
  }

  const constitutionalFiles = policy.constitutional_files || []

  for (const file of changedFiles) {
    // Check constitutional files
    if (constitutionalFiles.some(cf => file.includes(cf) || file === cf)) {
      diff.constitutional_files_touched = true
    }

    // Check packages/** changes
    if (file.startsWith('packages/')) {
      diff.packages_api_changed = true
    }

    // Check migration files
    if (file.includes('migrations/')) {
      // Would need to read file content to determine if reversible
      // For now, mark as having migration
      diff.migration_with_down = true
    }
  }

  return diff
}

/**
 * Run full GDR analysis on changed files
 */
function runGDRAnalysis(changedFiles) {
  const diff = analyzeDiff(changedFiles)
  const gdrLevel = determineGDRLevel(diff)

  return {
    changed_files: changedFiles,
    diff_analysis: diff,
    gdr_level: gdrLevel.level,
    gdr_level_name: ['Normal', 'Append-only', 'Structural', 'Constitutional'][gdrLevel.level],
    reason: gdrLevel.reason,
    required_approver: gdrLevel.required_approver,
    gdr_required: gdrLevel.gdr_required,
    auto_suspend: gdrLevel.auto_suspend
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
Gate0 Invariant Check v1.1
Document: SLG_SnapOps_Operational_Launch_v1.1

Usage:
  node scripts/gate0/invariant_check.mjs --event-schema
  node scripts/gate0/invariant_check.mjs --create-baseline
  node scripts/gate0/invariant_check.mjs --gdr <file1> [file2...]
  node scripts/gate0/invariant_check.mjs --all

Options:
  --event-schema     Check event schema against baseline (Tier-0 rule 1)
  --create-baseline  Create baseline from current telemetry
  --gdr <files>      Determine GDR (Governance Diff Report) level for changed files
  --all              Run all invariant checks

GDR Levels (§四):
  - Level 0: Normal change (no structural changes)
  - Level 1: Append-only (new fields/states, auto-approve)
  - Level 2: Structural change (CTO approval required)
  - Level 3: Constitutional (CEO + CTO dual approval, auto-suspend)

Severity Levels:
  - warning:        Log and alert, does not block commit
  - major:          Immediate downgrade, CTO unlock required
  - constitutional: Downgrade to Gate A + suspend + CEO unlock required
`)
  process.exit(0)
}

if (args.includes('--create-baseline')) {
  createBaseline()
  process.exit(0)
}

if (args.includes('--gdr')) {
  const idx = args.indexOf('--gdr')
  const files = args.slice(idx + 1).filter(f => !f.startsWith('-'))

  if (files.length === 0) {
    console.error('ERROR: --gdr requires at least one file')
    process.exit(1)
  }

  const result = runGDRAnalysis(files)
  console.log(JSON.stringify(result, null, 2))

  // Exit code based on GDR level
  // Level 3 (constitutional) = exit 3
  // Level 2 (structural) = exit 2
  // Level 1 (append-only) = exit 0
  // Level 0 (normal) = exit 0
  process.exit(result.gdr_level >= 2 ? result.gdr_level : 0)
}

if (args.includes('--event-schema') || args.includes('--all')) {
  const result = checkEventSchema()
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.passed ? 0 : 1)
}

console.error('ERROR: Unknown command. Use --help for usage.')
process.exit(1)
