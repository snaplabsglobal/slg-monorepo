#!/usr/bin/env node
/**
 * Gate0 Policy Loader v1.0
 * ============================================================================
 * Document: SLG_Governance_Constitution_v1.0-final
 *
 * Loads and validates policy.json, provides utilities for policy queries.
 *
 * Usage:
 *   node scripts/gate0/policy.mjs --validate
 *   node scripts/gate0/policy.mjs --get <path>
 *   node scripts/gate0/policy.mjs --actor-can <actor> <action>
 * ============================================================================
 */
import fs from 'node:fs'
import path from 'node:path'

// ============================================================================
// CONSTANTS
// ============================================================================

const POLICY_PATH = path.resolve(process.cwd(), 'policy.json')

// Required top-level keys in policy.json
const REQUIRED_KEYS = [
  'version',
  'system_name',
  'mode',
  'constitutional_files',
  'actors',
  'autonomy_levels',
  'governance_invariants'
]

// ============================================================================
// POLICY LOADING
// ============================================================================

/**
 * Load policy.json
 * @returns {object|null}
 */
export function loadPolicy() {
  if (!fs.existsSync(POLICY_PATH)) {
    return null
  }

  try {
    return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'))
  } catch (err) {
    console.error('ERROR: Invalid JSON in policy.json:', err.message)
    return null
  }
}

/**
 * Validate policy.json structure
 * @param {object} policy
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePolicy(policy) {
  const errors = []

  if (!policy) {
    return { valid: false, errors: ['Policy is null or undefined'] }
  }

  // Check required keys
  for (const key of REQUIRED_KEYS) {
    if (!(key in policy)) {
      errors.push(`Missing required key: ${key}`)
    }
  }

  // Validate version format
  if (policy.version && !/^\d+\.\d+\.\d+$/.test(policy.version)) {
    errors.push(`Invalid version format: ${policy.version} (expected semver)`)
  }

  // Validate autonomy levels
  if (policy.autonomy_levels) {
    for (const [level, config] of Object.entries(policy.autonomy_levels)) {
      if (!['A', 'B', 'C'].includes(level)) {
        errors.push(`Invalid autonomy level: ${level}`)
      }
      if (typeof config.max_risk_per_patch !== 'number') {
        errors.push(`Missing max_risk_per_patch for level ${level}`)
      }
      if (typeof config.risk_budget_limit !== 'number') {
        errors.push(`Missing risk_budget_limit for level ${level}`)
      }
    }
  }

  // Validate actors
  if (policy.actors) {
    for (const [actor, permissions] of Object.entries(policy.actors)) {
      if (permissions.can && !Array.isArray(permissions.can)) {
        errors.push(`Actor ${actor}: 'can' must be an array`)
      }
      if (permissions.cannot && !Array.isArray(permissions.cannot)) {
        errors.push(`Actor ${actor}: 'cannot' must be an array`)
      }
    }
  }

  // Validate governance invariants
  if (policy.governance_invariants) {
    if (!policy.governance_invariants.priority_order) {
      errors.push('Missing governance_invariants.priority_order')
    }
    if (!policy.governance_invariants.violation_severity_levels) {
      errors.push('Missing governance_invariants.violation_severity_levels')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get a nested value from policy by dot-separated path
 * @param {object} policy
 * @param {string} path - e.g., "autonomy_levels.A.max_risk_per_patch"
 * @returns {any}
 */
export function getPolicyValue(policy, keyPath) {
  const parts = keyPath.split('.')
  let current = policy

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined
    }
    current = current[part]
  }

  return current
}

/**
 * Check if an actor can perform an action
 * @param {object} policy
 * @param {string} actor - e.g., "AI", "CTO", "CEO"
 * @param {string} action - e.g., "propose_patch", "modify_policy"
 * @returns {{ allowed: boolean, reason: string }}
 */
export function canActorPerform(policy, actor, action) {
  const actorConfig = policy?.actors?.[actor]

  if (!actorConfig) {
    return { allowed: false, reason: `Unknown actor: ${actor}` }
  }

  // Check explicit cannot
  if (actorConfig.cannot?.includes(action)) {
    return { allowed: false, reason: `${actor} explicitly cannot: ${action}` }
  }

  // Check explicit can
  if (actorConfig.can?.includes(action)) {
    return { allowed: true, reason: `${actor} can: ${action}` }
  }

  // Default: not explicitly allowed means denied
  return { allowed: false, reason: `${actor} not explicitly allowed: ${action}` }
}

/**
 * Get the current autonomy level configuration
 * @param {object} policy
 * @param {string} gate - "A", "B", or "C"
 * @returns {object|null}
 */
export function getAutonomyConfig(policy, gate) {
  return policy?.autonomy_levels?.[gate] || null
}

/**
 * Check if an error class is allowed at a given gate
 * @param {object} policy
 * @param {string} errorClass
 * @param {string} gate
 * @returns {{ allowed: boolean, requires_manual: boolean }}
 */
export function isErrorClassAllowed(policy, errorClass, gate) {
  const permissions = policy?.error_class_permissions?.[errorClass]

  if (!permissions) {
    return { allowed: false, requires_manual: false }
  }

  const allowed = permissions.allowed_gates?.includes(gate) || false
  const requiresManual = permissions.requires_manual_cto || false

  return { allowed, requires_manual: requiresManual }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
Gate0 Policy Loader v1.0

Usage:
  node scripts/gate0/policy.mjs --validate
  node scripts/gate0/policy.mjs --get <path>
  node scripts/gate0/policy.mjs --actor-can <actor> <action>
  node scripts/gate0/policy.mjs --error-allowed <class> <gate>
  node scripts/gate0/policy.mjs --dump

Options:
  --validate        Validate policy.json structure
  --get             Get a value by dot-separated path
  --actor-can       Check if actor can perform action
  --error-allowed   Check if error class is allowed at gate
  --dump            Pretty-print entire policy
`)
  process.exit(0)
}

const policy = loadPolicy()

if (!policy) {
  console.error('ERROR: Cannot load policy.json')
  process.exit(1)
}

if (args.includes('--validate')) {
  const result = validatePolicy(policy)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.valid ? 0 : 1)
}

if (args.includes('--get')) {
  const idx = args.indexOf('--get')
  const keyPath = args[idx + 1]

  if (!keyPath) {
    console.error('ERROR: --get requires a path argument')
    process.exit(1)
  }

  const value = getPolicyValue(policy, keyPath)
  console.log(JSON.stringify(value, null, 2))
  process.exit(0)
}

if (args.includes('--actor-can')) {
  const idx = args.indexOf('--actor-can')
  const actor = args[idx + 1]
  const action = args[idx + 2]

  if (!actor || !action) {
    console.error('ERROR: --actor-can requires <actor> <action> arguments')
    process.exit(1)
  }

  const result = canActorPerform(policy, actor, action)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.allowed ? 0 : 1)
}

if (args.includes('--error-allowed')) {
  const idx = args.indexOf('--error-allowed')
  const errorClass = args[idx + 1]
  const gate = args[idx + 2]

  if (!errorClass || !gate) {
    console.error('ERROR: --error-allowed requires <class> <gate> arguments')
    process.exit(1)
  }

  const result = isErrorClassAllowed(policy, errorClass, gate)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.allowed ? 0 : 1)
}

if (args.includes('--dump')) {
  console.log(JSON.stringify(policy, null, 2))
  process.exit(0)
}

console.error('ERROR: Unknown command. Use --help for usage.')
process.exit(1)
