#!/usr/bin/env npx tsx
/**
 * SEOS Intervene CLI
 *
 * Usage:
 *   pnpm seos:intervene --type ENV --severity P0 --reason "local missing R2 vars"
 *
 * CTO 每次要求 CEO 操作前，必须先跑一次。否则属于"违规干预"。
 */

import {
  createIntervention,
  closeIntervention,
  getInterventionStats,
  getBudgetState,
  getAutonomyState,
  type InterventionType,
  type InterventionSeverity,
  type RootCauseGuess,
} from '../intervention'

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      result[key] = value || 'true'
    }
  }
  return result
}

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  const parsed = parseArgs(args.slice(1))

  if (command === 'create' || command === 'log' || !command || args[0]?.startsWith('--')) {
    // Create intervention
    const finalParsed = command?.startsWith('--') ? parseArgs(args) : parsed

    if (!finalParsed.type || !finalParsed.severity || !finalParsed.reason) {
      console.log('Usage: pnpm seos:intervene --type=ENV --severity=P0 --reason="description"')
      console.log('')
      console.log('Types: ENV, TOKEN, MERGE, MANUAL_FIX, TEST_REPORT, LOG_CHECK, BROWSER_FIX, OTHER')
      console.log('Severity: P0 (critical), P1 (important), P2 (minor)')
      process.exit(1)
    }

    const intervention = createIntervention({
      type: finalParsed.type as InterventionType,
      severity: finalParsed.severity as InterventionSeverity,
      reason: finalParsed.reason,
      root_cause_guess: (finalParsed.cause as RootCauseGuess) || 'UNKNOWN',
      linked_issue: finalParsed.issue,
    })

    console.log(`${c.yellow}⚠ INTERVENTION LOGGED${c.reset}`)
    console.log('')
    console.log(`ID: ${c.bold}${intervention.id}${c.reset}`)
    console.log(`Severity: ${intervention.severity === 'P0' ? c.red : c.yellow}${intervention.severity}${c.reset}`)
    console.log(`Type: ${intervention.type}`)
    console.log(`Reason: ${intervention.reason}`)
    console.log(`Root Cause: ${intervention.root_cause_guess}`)
    console.log('')
    console.log(`${c.dim}Required followup: ${intervention.followup_required.join(', ')}${c.reset}`)
    console.log('')
    console.log(`${c.bold}Remember: Any manual intervention is debt. Convert to Guard + Diagnose + CI.${c.reset}`)

  } else if (command === 'close') {
    // Close intervention
    if (!parsed.id || !parsed.note) {
      console.log('Usage: pnpm seos:intervene close --id=mi_xxx --note="Added guard" [--pr=PR-123]')
      process.exit(1)
    }

    const event = closeIntervention({
      id: parsed.id,
      linked_pr: parsed.pr,
      note: parsed.note,
    })

    console.log(`${c.green}✓ INTERVENTION CLOSED${c.reset}`)
    console.log(`ID: ${event.id}`)
    console.log(`Note: ${event.note}`)
    if (event.linked_pr) {
      console.log(`PR: ${event.linked_pr}`)
    }

  } else if (command === 'status') {
    // Show status
    const stats = getInterventionStats()
    const budget = getBudgetState()
    const autonomy = getAutonomyState()

    console.log(`${c.bold}${c.cyan}`)
    console.log('╔══════════════════════════════════════════════════════════════╗')
    console.log('║                    SEOS INTERVENTION STATUS                  ║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    console.log(`${c.reset}`)

    // Stats
    console.log(`${c.bold}Manual Interventions (7d)${c.reset}`)
    console.log(`  P0: ${stats.p0_count_7d === 0 ? c.green : c.red}${stats.p0_count_7d}${c.reset}`)
    console.log(`  P1: ${stats.p1_count_7d <= 2 ? c.green : c.yellow}${stats.p1_count_7d}${c.reset}`)
    console.log(`  Open: ${stats.open_count === 0 ? c.green : c.red}${stats.open_count}${c.reset}`)
    console.log(`  Streak: ${stats.streak_days} days without intervention`)
    if (stats.last_intervention) {
      console.log(`  Last: ${stats.last_intervention}`)
    }
    if (stats.top_causes.length > 0) {
      console.log(`  Top causes: ${stats.top_causes.map(c => `${c.cause} (${c.count})`).join(', ')}`)
    }
    console.log('')

    // Budget
    console.log(`${c.bold}Intervention Budget${c.reset}`)
    const budgetColor = budget.status === 'SAFE' ? c.green : budget.status === 'WARNING' ? c.yellow : c.red
    console.log(`  P0 used: ${budget.p0_used} / ${budget.p0_limit}`)
    console.log(`  P1 used: ${budget.p1_used} / ${budget.p1_limit}`)
    console.log(`  Status: ${budgetColor}${budget.status}${c.reset}`)
    console.log(`  Health: ${budget.health === 'HEALTHY' ? c.green : c.red}${budget.health}${c.reset}`)
    console.log('')

    // Autonomy
    console.log(`${c.bold}Autonomy Level${c.reset}`)
    console.log(`  Level: ${c.cyan}${autonomy.level}${c.reset} (Gate ${autonomy.gate})`)
    console.log(`  Progress to next: ${autonomy.progress_to_next}%`)
    if (autonomy.conditions_needed.length > 0) {
      console.log(`  ${c.dim}Needed: ${autonomy.conditions_needed.join(', ')}${c.reset}`)
    }

  } else {
    console.log('Commands:')
    console.log('  pnpm seos:intervene --type=ENV --severity=P0 --reason="description"')
    console.log('  pnpm seos:intervene close --id=mi_xxx --note="Added guard"')
    console.log('  pnpm seos:intervene status')
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
