#!/usr/bin/env node
/**
 * Gate0 Risk Assessment Engine v1.0
 * ============================================================================
 * Document: SLG_Governance_Constitution_v1.0-final §五
 *
 * Calculates risk score for proposed patches and enforces constitutional
 * file protection.
 *
 * Usage:
 *   node scripts/gate0/risk.mjs <patch_file>
 *   node scripts/gate0/risk.mjs --check-files <file1> [file2...]
 *
 * Returns:
 *   { "risk": number, "reason": string, "allowed": boolean }
 * ============================================================================
 */
import fs from 'node:fs'
import path from 'node:path'
import { minimatch } from 'minimatch'

// ============================================================================
// LOAD POLICY
// ============================================================================

const POLICY_PATH = path.resolve(process.cwd(), 'policy.json')
let policy

try {
  policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'))
} catch (err) {
  console.error('ERROR: Cannot load policy.json:', err.message)
  process.exit(1)
}

// ============================================================================
// CONSTITUTIONAL FILE PROTECTION
// ============================================================================

/**
 * Check if a file path matches any constitutional file pattern
 * Touching constitutional files = risk 100 (maximum, blocked)
 */
function isConstitutionalFile(filePath) {
  const constitutionalFiles = policy.constitutional_files || []
  const normalizedPath = filePath.replace(/\\/g, '/')

  for (const pattern of constitutionalFiles) {
    if (minimatch(normalizedPath, pattern) || normalizedPath === pattern) {
      return true
    }
  }

  return false
}

/**
 * Check if a file path matches any forbidden path pattern
 */
function isForbiddenPath(filePath) {
  const forbiddenPaths = policy.forbidden_paths_global || []
  const normalizedPath = filePath.replace(/\\/g, '/')

  for (const pattern of forbiddenPaths) {
    if (minimatch(normalizedPath, pattern, { dot: true })) {
      return true
    }
  }

  return false
}

// ============================================================================
// RISK SCORING
// ============================================================================

/**
 * Risk factors and their weights
 * Total possible risk: 100
 */
const RISK_FACTORS = {
  // File type risks
  MIGRATION_FILE: 30,          // Database migrations are high risk
  PACKAGE_JSON: 20,            // Dependency changes
  CONFIG_FILE: 15,             // Configuration files
  WORKFLOW_FILE: 25,           // CI/CD workflows
  SHARED_PACKAGE: 20,          // Shared library changes

  // Change scope risks
  MULTIPLE_APPS: 15,           // Changes span multiple apps
  LARGE_DIFF: 10,              // > 500 lines changed

  // Content risks
  ENV_VARIABLE: 10,            // Environment variable changes
  SECRET_PATTERN: 25,          // Potential secret exposure
  EXTERNAL_DEPENDENCY: 10,     // New external dependency
}

/**
 * Calculate risk score for a set of changed files
 */
function calculateRisk(changedFiles) {
  let totalRisk = 0
  const reasons = []

  // Check for constitutional files (instant max risk)
  for (const file of changedFiles) {
    if (isConstitutionalFile(file)) {
      return {
        risk: 100,
        reasons: [`CONSTITUTIONAL_FILE_MODIFIED: ${file}`],
        allowed: false,
        severity: 'constitutional'
      }
    }
  }

  // Check for forbidden paths
  for (const file of changedFiles) {
    if (isForbiddenPath(file)) {
      totalRisk += 30
      reasons.push(`FORBIDDEN_PATH: ${file}`)
    }
  }

  // Check file type risks
  for (const file of changedFiles) {
    const basename = path.basename(file)
    const ext = path.extname(file)

    if (file.includes('migrations/')) {
      totalRisk += RISK_FACTORS.MIGRATION_FILE
      reasons.push(`MIGRATION_FILE: ${file}`)
    }

    if (basename === 'package.json') {
      totalRisk += RISK_FACTORS.PACKAGE_JSON
      reasons.push(`PACKAGE_JSON: ${file}`)
    }

    if (['.env', '.env.local', '.env.example'].some(e => basename.includes(e))) {
      totalRisk += RISK_FACTORS.ENV_VARIABLE
      reasons.push(`ENV_FILE: ${file}`)
    }

    if (file.includes('.github/workflows/')) {
      totalRisk += RISK_FACTORS.WORKFLOW_FILE
      reasons.push(`WORKFLOW_FILE: ${file}`)
    }

    if (file.startsWith('packages/')) {
      totalRisk += RISK_FACTORS.SHARED_PACKAGE
      reasons.push(`SHARED_PACKAGE: ${file}`)
    }

    if (['.yml', '.yaml', '.json', '.toml'].includes(ext) &&
        !basename.includes('package') &&
        !basename.includes('tsconfig')) {
      totalRisk += RISK_FACTORS.CONFIG_FILE
      reasons.push(`CONFIG_FILE: ${file}`)
    }
  }

  // Check for multi-app changes
  const apps = new Set(
    changedFiles
      .filter(f => f.startsWith('apps/'))
      .map(f => f.split('/')[1])
  )
  if (apps.size > 1) {
    totalRisk += RISK_FACTORS.MULTIPLE_APPS
    reasons.push(`MULTIPLE_APPS: ${[...apps].join(', ')}`)
  }

  // Cap at 100
  totalRisk = Math.min(100, totalRisk)

  // Load current gate from autonomy state
  let currentGate = 'A'
  try {
    const stateFile = path.resolve(process.cwd(), 'out/state/autonomy-state.json')
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
    currentGate = state.current_gate || 'A'
  } catch {
    // Default to Gate A if state file doesn't exist
  }

  const gateConfig = policy.autonomy_levels[currentGate]
  const maxRisk = gateConfig?.max_risk_per_patch || 30

  return {
    risk: totalRisk,
    reasons,
    allowed: totalRisk <= maxRisk,
    currentGate,
    maxRiskAllowed: maxRisk,
    severity: totalRisk >= 80 ? 'major' : totalRisk >= 50 ? 'warning' : 'low'
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
Gate0 Risk Assessment Engine v1.0

Usage:
  node scripts/gate0/risk.mjs --check-files <file1> [file2...]
  node scripts/gate0/risk.mjs --check-constitutional <file>
  node scripts/gate0/risk.mjs --status

Options:
  --check-files        Calculate risk for a list of changed files
  --check-constitutional  Check if a file is constitutional
  --status            Show current gate and risk budget status
`)
  process.exit(0)
}

if (args[0] === '--check-files') {
  const files = args.slice(1)
  if (files.length === 0) {
    console.error('ERROR: No files specified')
    process.exit(1)
  }

  const result = calculateRisk(files)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.allowed ? 0 : 1)
}

if (args[0] === '--check-constitutional') {
  const file = args[1]
  if (!file) {
    console.error('ERROR: No file specified')
    process.exit(1)
  }

  const isConst = isConstitutionalFile(file)
  console.log(JSON.stringify({ file, is_constitutional: isConst }))
  process.exit(isConst ? 1 : 0)
}

if (args[0] === '--status') {
  let state = { current_gate: 'A' }
  let ledger = { budget_used: 0 }

  try {
    state = JSON.parse(fs.readFileSync('out/state/autonomy-state.json', 'utf8'))
  } catch { /* ignore */ }

  try {
    ledger = JSON.parse(fs.readFileSync('out/state/risk-ledger.json', 'utf8'))
  } catch { /* ignore */ }

  const gateConfig = policy.autonomy_levels[state.current_gate]

  console.log(JSON.stringify({
    current_gate: state.current_gate,
    gate_name: gateConfig?.name || 'Unknown',
    risk_budget_limit: gateConfig?.risk_budget_limit || 50,
    budget_used: ledger.budget_used || 0,
    budget_remaining: (gateConfig?.risk_budget_limit || 50) - (ledger.budget_used || 0),
    max_risk_per_patch: gateConfig?.max_risk_per_patch || 30,
    allowed_error_classes: gateConfig?.allowed_error_classes || []
  }, null, 2))
  process.exit(0)
}

console.error('ERROR: Unknown command. Use --help for usage.')
process.exit(1)
