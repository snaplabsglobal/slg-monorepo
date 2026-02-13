#!/usr/bin/env node
/**
 * Gate0 Error Class Whitelist Manager v1.0
 * ============================================================================
 * Document: SLG_Governance_Constitution_v1.0-final
 *
 * Manages the whitelist of error classes that can be auto-fixed at each gate.
 *
 * Gate A: Only LOCKFILE_OUT_OF_SYNC
 * Gate B: + MODULE_NOT_FOUND_WORKSPACE_PKG, NO_EXPORTED_MEMBER
 * Gate C: + SHARED_LIB_CHANGE (with CTO approval)
 *
 * Usage:
 *   node scripts/gate0/whitelist.mjs --check <error_class>
 *   node scripts/gate0/whitelist.mjs --list [gate]
 * ============================================================================
 */
import fs from 'node:fs'
import path from 'node:path'

// ============================================================================
// CONSTANTS
// ============================================================================

const POLICY_PATH = path.resolve(process.cwd(), 'policy.json')
const STATE_PATH = path.resolve(process.cwd(), 'out/state/autonomy-state.json')

// ============================================================================
// LOADERS
// ============================================================================

function loadPolicy() {
  try {
    return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'))
  } catch {
    return null
  }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
  } catch {
    return { current_gate: 'A' }
  }
}

// ============================================================================
// WHITELIST OPERATIONS
// ============================================================================

/**
 * Check if an error class is whitelisted for auto-fix at current gate
 * @param {string} errorClass
 * @returns {{ allowed: boolean, gate: string, requires_cto: boolean, reason: string }}
 */
export function checkErrorClass(errorClass) {
  const policy = loadPolicy()
  const state = loadState()

  if (!policy) {
    return {
      allowed: false,
      gate: 'A',
      requires_cto: false,
      reason: 'Cannot load policy.json'
    }
  }

  const currentGate = state.current_gate || 'A'
  const gateConfig = policy.autonomy_levels?.[currentGate]
  const errorPermissions = policy.error_class_permissions?.[errorClass]

  // Check if error class exists in policy
  if (!errorPermissions) {
    return {
      allowed: false,
      gate: currentGate,
      requires_cto: false,
      reason: `Unknown error class: ${errorClass}`
    }
  }

  // Check if allowed at current gate
  const allowedGates = errorPermissions.allowed_gates || []
  if (!allowedGates.includes(currentGate)) {
    return {
      allowed: false,
      gate: currentGate,
      requires_cto: false,
      reason: `${errorClass} not allowed at Gate ${currentGate}. Allowed at: ${allowedGates.join(', ')}`
    }
  }

  // Check if CTO approval required
  const requiresCto = errorPermissions.requires_manual_cto || false

  return {
    allowed: true,
    gate: currentGate,
    requires_cto: requiresCto,
    reason: requiresCto
      ? `${errorClass} allowed at Gate ${currentGate} with CTO approval`
      : `${errorClass} allowed at Gate ${currentGate}`
  }
}

/**
 * List all whitelisted error classes for a gate
 * @param {string} [gate] - Gate level (A, B, C). If not specified, uses current gate.
 * @returns {{ gate: string, error_classes: Array }}
 */
export function listWhitelist(gate = null) {
  const policy = loadPolicy()
  const state = loadState()

  if (!policy) {
    return {
      gate: gate || 'A',
      error_classes: []
    }
  }

  const targetGate = gate || state.current_gate || 'A'
  const gateConfig = policy.autonomy_levels?.[targetGate]
  const errorPermissions = policy.error_class_permissions || {}

  // Build list of allowed error classes
  const errorClasses = []

  for (const [className, permissions] of Object.entries(errorPermissions)) {
    const allowedGates = permissions.allowed_gates || []
    if (allowedGates.includes(targetGate)) {
      errorClasses.push({
        class: className,
        requires_cto: permissions.requires_manual_cto || false
      })
    }
  }

  return {
    gate: targetGate,
    gate_name: gateConfig?.name || 'Unknown',
    error_classes: errorClasses,
    max_risk_per_patch: gateConfig?.max_risk_per_patch || 30,
    risk_budget_limit: gateConfig?.risk_budget_limit || 50
  }
}

/**
 * Get all gates and their configurations
 */
export function listAllGates() {
  const policy = loadPolicy()
  const state = loadState()

  if (!policy) {
    return { current_gate: 'A', gates: {} }
  }

  const gates = {}

  for (const [level, config] of Object.entries(policy.autonomy_levels || {})) {
    gates[level] = {
      name: config.name,
      max_risk_per_patch: config.max_risk_per_patch,
      risk_budget_limit: config.risk_budget_limit,
      double_audit_required: config.double_audit_required,
      requires_observation_window: config.requires_observation_window,
      allowed_error_classes: config.allowed_error_classes
    }
  }

  return {
    current_gate: state.current_gate || 'A',
    gates
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
Gate0 Error Class Whitelist Manager v1.0

Usage:
  node scripts/gate0/whitelist.mjs --check <error_class>
  node scripts/gate0/whitelist.mjs --list [gate]
  node scripts/gate0/whitelist.mjs --all

Options:
  --check     Check if an error class is allowed at current gate
  --list      List allowed error classes for a gate (default: current)
  --all       Show all gates and their configurations

Error Classes:
  LOCKFILE_OUT_OF_SYNC           - Lock file mismatch (Gate A+)
  MODULE_NOT_FOUND_WORKSPACE_PKG - Missing workspace package (Gate B+)
  NO_EXPORTED_MEMBER             - TypeScript export errors (Gate B+)
  SHARED_LIB_CHANGE              - Shared library changes (Gate C, CTO required)
`)
  process.exit(0)
}

if (args.includes('--check')) {
  const idx = args.indexOf('--check')
  const errorClass = args[idx + 1]

  if (!errorClass) {
    console.error('ERROR: --check requires an error class')
    process.exit(1)
  }

  const result = checkErrorClass(errorClass)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.allowed ? 0 : 1)
}

if (args.includes('--list')) {
  const idx = args.indexOf('--list')
  const gate = args[idx + 1]

  // Check if the next arg looks like a gate (A, B, C) or another flag
  const targetGate = gate && ['A', 'B', 'C'].includes(gate.toUpperCase())
    ? gate.toUpperCase()
    : null

  const result = listWhitelist(targetGate)
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

if (args.includes('--all')) {
  const result = listAllGates()
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

console.error('ERROR: Unknown command. Use --help for usage.')
process.exit(1)
