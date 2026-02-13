#!/usr/bin/env node
/**
 * Gate0 Suspend Manager v1.0
 * ============================================================================
 * Document: SLG_Governance_Constitution_v1.0-final
 *
 * Manages system suspend state for the autonomous self-heal system.
 *
 * Suspend triggers:
 *   1. Constitutional violation detected
 *   2. Risk budget exceeded (>80%)
 *   3. Consecutive simulate failures (>2)
 *   4. Health Score below 60
 *   5. Manual CTO/CEO suspension
 *
 * Usage:
 *   node scripts/gate0/suspend.mjs --status
 *   node scripts/gate0/suspend.mjs --trigger <reason>
 *   node scripts/gate0/suspend.mjs --unlock <actor>
 * ============================================================================
 */
import fs from 'node:fs'
import path from 'node:path'

// ============================================================================
// CONSTANTS
// ============================================================================

const STATE_PATH = path.resolve(process.cwd(), 'out/state/autonomy-state.json')
const POLICY_PATH = path.resolve(process.cwd(), 'policy.json')

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Load autonomy state
 */
function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'))
  } catch {
    return {
      current_gate: 'A',
      since: new Date().toISOString(),
      suspended: false,
      suspend_history: []
    }
  }
}

/**
 * Save autonomy state
 */
function saveState(state) {
  const dir = path.dirname(STATE_PATH)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2))
}

/**
 * Load policy
 */
function loadPolicy() {
  try {
    return JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'))
  } catch {
    return null
  }
}

// ============================================================================
// SUSPEND OPERATIONS
// ============================================================================

/**
 * Check if system is currently suspended
 */
export function isSuspended() {
  const state = loadState()
  return state.suspended === true
}

/**
 * Get suspend status
 */
export function getSuspendStatus() {
  const state = loadState()
  const policy = loadPolicy()

  return {
    suspended: state.suspended || false,
    suspended_at: state.suspended_at || null,
    suspend_reason: state.suspend_reason || null,
    unlock_required_by: state.unlock_required_by || null,
    cooldown_hours: policy?.suspend_policy?.cooldown_hours || 12,
    cooldown_ends_at: state.suspended_at
      ? new Date(new Date(state.suspended_at).getTime() + (policy?.suspend_policy?.cooldown_hours || 12) * 3600000).toISOString()
      : null,
    recent_suspensions: (state.suspend_history || []).slice(-5)
  }
}

/**
 * Trigger system suspension
 * @param {string} reason - Reason for suspension
 * @param {'constitutional'|'major'|'manual'} severity
 * @returns {{ success: boolean, message: string }}
 */
export function triggerSuspend(reason, severity = 'major') {
  const state = loadState()

  if (state.suspended) {
    return {
      success: false,
      message: 'System already suspended'
    }
  }

  const suspendRecord = {
    timestamp: new Date().toISOString(),
    reason,
    severity,
    gate_at_time: state.current_gate
  }

  state.suspended = true
  state.suspended_at = suspendRecord.timestamp
  state.suspend_reason = reason
  state.suspend_severity = severity

  // Determine who can unlock
  if (severity === 'constitutional') {
    state.unlock_required_by = 'CEO'
    // Force downgrade to Gate A
    if (state.current_gate !== 'A') {
      state.downgrade_history = state.downgrade_history || []
      state.downgrade_history.push({
        from: state.current_gate,
        to: 'A',
        timestamp: suspendRecord.timestamp,
        reason: `Constitutional violation: ${reason}`
      })
      state.current_gate = 'A'
      state.since = suspendRecord.timestamp
    }
  } else {
    state.unlock_required_by = 'CTO'
  }

  state.suspend_history = state.suspend_history || []
  state.suspend_history.push(suspendRecord)

  saveState(state)

  return {
    success: true,
    message: `System suspended: ${reason}`,
    unlock_required_by: state.unlock_required_by
  }
}

/**
 * Unlock system suspension
 * @param {string} actor - Who is unlocking (CTO or CEO)
 * @param {string} [override_reason] - Reason for override (if bypassing cooldown)
 * @returns {{ success: boolean, message: string }}
 */
export function unlockSuspend(actor, override_reason = null) {
  const state = loadState()
  const policy = loadPolicy()

  if (!state.suspended) {
    return {
      success: false,
      message: 'System is not suspended'
    }
  }

  // Check if actor has permission to unlock
  const requiredUnlocker = state.unlock_required_by || 'CTO'

  if (requiredUnlocker === 'CEO' && actor !== 'CEO') {
    return {
      success: false,
      message: `Constitutional suspension requires CEO unlock, not ${actor}`
    }
  }

  if (requiredUnlocker === 'CTO' && !['CTO', 'CEO'].includes(actor)) {
    return {
      success: false,
      message: `Suspension requires CTO or CEO unlock, not ${actor}`
    }
  }

  // Check cooldown
  const cooldownHours = policy?.suspend_policy?.cooldown_hours || 12
  const suspendedAt = new Date(state.suspended_at)
  const cooldownEnds = new Date(suspendedAt.getTime() + cooldownHours * 3600000)
  const now = new Date()

  if (now < cooldownEnds && !override_reason) {
    return {
      success: false,
      message: `Cooldown not complete. Ends at ${cooldownEnds.toISOString()}. Use override_reason to bypass.`,
      cooldown_remaining_hours: (cooldownEnds.getTime() - now.getTime()) / 3600000
    }
  }

  // Record unlock
  const unlockRecord = {
    timestamp: now.toISOString(),
    actor,
    override_reason: override_reason || null,
    bypassed_cooldown: now < cooldownEnds
  }

  state.suspended = false
  state.suspended_at = null
  state.suspend_reason = null
  state.suspend_severity = null
  state.unlock_required_by = null

  // Add to last suspend record
  if (state.suspend_history && state.suspend_history.length > 0) {
    state.suspend_history[state.suspend_history.length - 1].unlocked = unlockRecord
  }

  saveState(state)

  return {
    success: true,
    message: `System unlocked by ${actor}`,
    bypassed_cooldown: unlockRecord.bypassed_cooldown
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

const args = process.argv.slice(2)

if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
  console.log(`
Gate0 Suspend Manager v1.0

Usage:
  node scripts/gate0/suspend.mjs --status
  node scripts/gate0/suspend.mjs --trigger <reason> [--severity <level>]
  node scripts/gate0/suspend.mjs --unlock <actor> [--override-reason <reason>]

Options:
  --status             Show current suspend status
  --trigger            Trigger suspension with reason
  --severity           Suspension severity: constitutional | major | manual (default: major)
  --unlock             Unlock suspension as actor (CTO or CEO)
  --override-reason    Reason for bypassing cooldown
`)
  process.exit(0)
}

if (args.includes('--status')) {
  const status = getSuspendStatus()
  console.log(JSON.stringify(status, null, 2))
  process.exit(status.suspended ? 1 : 0)
}

if (args.includes('--trigger')) {
  const idx = args.indexOf('--trigger')
  const reason = args[idx + 1]

  if (!reason) {
    console.error('ERROR: --trigger requires a reason')
    process.exit(1)
  }

  let severity = 'major'
  const sevIdx = args.indexOf('--severity')
  if (sevIdx !== -1 && args[sevIdx + 1]) {
    severity = args[sevIdx + 1]
  }

  const result = triggerSuspend(reason, severity)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.success ? 0 : 1)
}

if (args.includes('--unlock')) {
  const idx = args.indexOf('--unlock')
  const actor = args[idx + 1]

  if (!actor) {
    console.error('ERROR: --unlock requires an actor (CTO or CEO)')
    process.exit(1)
  }

  let override_reason = null
  const orIdx = args.indexOf('--override-reason')
  if (orIdx !== -1 && args[orIdx + 1]) {
    override_reason = args[orIdx + 1]
  }

  const result = unlockSuspend(actor, override_reason)
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.success ? 0 : 1)
}

console.error('ERROR: Unknown command. Use --help for usage.')
process.exit(1)
