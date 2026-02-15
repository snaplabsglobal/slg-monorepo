#!/usr/bin/env tsx
/**
 * SEOS Metrics CLI
 *
 * Usage: pnpm run metrics
 *
 * Displays current SEOS metrics including:
 * - Radar scores (5 dimensions)
 * - Level with floor locks
 * - Guard coverage statistics
 * - ESI and SSI estimates
 */

import {
  calculateObservability,
  calculateDiagnoseCapability,
  calculateGuardCoverage,
  calculateBudgetDiscipline,
  calculateDomainIntegrity,
  calculateLevel,
  calculateSSI,
  calculateESI,
  getGuardLayerDistribution,
  getGuardAgingStatus,
  type RadarScores,
} from '../metrics'

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

function colorize(value: number, thresholds: { green: number; yellow: number }): string {
  if (value >= thresholds.green) return colors.green + value + '%' + colors.reset
  if (value >= thresholds.yellow) return colors.yellow + value + '%' + colors.reset
  return colors.red + value + '%' + colors.reset
}

function levelColor(level: number): string {
  if (level >= 4) return colors.green + level + colors.reset
  if (level >= 2) return colors.yellow + level + colors.reset
  return colors.red + level + colors.reset
}

async function main() {
  console.log('\n' + colors.bold + '╔════════════════════════════════════════════════════════════╗')
  console.log('║              SEOS Evolution Metrics v1.1                   ║')
  console.log('╚════════════════════════════════════════════════════════════╝' + colors.reset + '\n')

  // Calculate radar scores
  const guardCoverageData = calculateGuardCoverage()

  // Mock domain results for now
  const domainResults = [
    { domain: 'www.jobsitesnap.com', healthy: true, responseTime: 450 },
    { domain: 'jss.snaplabs.global', healthy: true, responseTime: 380 },
    { domain: 'jss-web.vercel.app', healthy: true, responseTime: 420 },
  ]

  const radar: RadarScores = {
    observability: calculateObservability(),
    diagnoseCapability: calculateDiagnoseCapability(),
    guardCoverage: guardCoverageData.percentage,
    budgetDiscipline: calculateBudgetDiscipline(0, 0, false),
    domainIntegrity: calculateDomainIntegrity(domainResults),
  }

  // Calculate level
  const level = calculateLevel(radar)

  // Calculate ESI
  const esi = calculateESI(1.0, 0.9, 0.8, 0.1)

  // Calculate SSI
  const ssi = calculateSSI(0, 1, 3, 0)

  // Guard statistics
  const guardLayers = getGuardLayerDistribution()
  const guardAging = getGuardAgingStatus()

  // Display Radar
  console.log(colors.cyan + '┌── Radar Scores ──────────────────────────────────────────────┐' + colors.reset)
  console.log(`│  O  Observability:       ${colorize(radar.observability, { green: 80, yellow: 60 }).padEnd(30)}  │`)
  console.log(`│  D  Diagnose Capability: ${colorize(radar.diagnoseCapability, { green: 80, yellow: 60 }).padEnd(30)}  │`)
  console.log(`│  G  Guard Coverage:      ${colorize(radar.guardCoverage, { green: 50, yellow: 30 }).padEnd(30)}  │`)
  console.log(`│  B  Budget Discipline:   ${colorize(radar.budgetDiscipline, { green: 60, yellow: 40 }).padEnd(30)}  │`)
  console.log(`│  DI Domain Integrity:    ${colorize(radar.domainIntegrity, { green: 80, yellow: 60 }).padEnd(30)}  │`)
  console.log(colors.cyan + '└──────────────────────────────────────────────────────────────┘' + colors.reset)

  // Display Level
  console.log('\n' + colors.cyan + '┌── Autonomy Level ────────────────────────────────────────────┐' + colors.reset)
  console.log(`│  Base Score:  ${level.baseScore}`)
  console.log(`│  Base Level:  ${level.baseLevel}`)
  console.log(`│  Final Level: ${levelColor(level.finalLevel)}`)
  if (level.floorLockActive) {
    console.log(`│  ${colors.yellow}⚠ Floor Lock: ${level.floorLockReason}${colors.reset}`)
  }
  console.log(colors.cyan + '└──────────────────────────────────────────────────────────────┘' + colors.reset)

  // Display ESI & SSI
  console.log('\n' + colors.cyan + '┌── Stability Indices ─────────────────────────────────────────┐' + colors.reset)
  const esiColorCode = esi.color === 'green' ? colors.green : esi.color === 'yellow' ? colors.yellow : colors.red
  const ssiColorCode = ssi.color === 'green' ? colors.green : ssi.color === 'yellow' ? colors.yellow : colors.red
  console.log(`│  ESI (7-day):  ${esiColorCode}${esi.value}${colors.reset}  ${esi.status}`)
  console.log(`│  SSI (30-day): ${ssiColorCode}${ssi.value}%${colors.reset}  ${ssi.trend === 'up' ? '↑' : ssi.trend === 'down' ? '↓' : '→'}`)
  console.log(colors.cyan + '└──────────────────────────────────────────────────────────────┘' + colors.reset)

  // Display Guard Statistics
  console.log('\n' + colors.cyan + '┌── Guard Statistics ──────────────────────────────────────────┐' + colors.reset)
  console.log(`│  Total Guards: ${guardCoverageData.total}`)
  console.log(`│  Effective:    ${guardCoverageData.effective}`)
  console.log(`│  Coverage:     ${guardCoverageData.percentage}%`)
  console.log(`│`)
  console.log(`│  By Layer:`)
  console.log(`│    RUNTIME: ${guardLayers.RUNTIME}  CI: ${guardLayers.CI}  BUILD: ${guardLayers.BUILD}  INFRA: ${guardLayers.INFRA}`)
  console.log(`│`)
  console.log(`│  By Age:`)
  console.log(`│    Active: ${guardAging.active}  Stale: ${guardAging.stale}  Archived: ${guardAging.archived}`)
  console.log(colors.cyan + '└──────────────────────────────────────────────────────────────┘' + colors.reset)

  // Display Mode
  const mode = esi.color === 'red' ? 'BUILDING' : esi.value >= 0.85 ? 'EVOLVING' : 'FROZEN_FOR_PRODUCT'
  const modeColor = mode === 'EVOLVING' ? colors.green : mode === 'FROZEN_FOR_PRODUCT' ? colors.yellow : colors.red
  console.log(`\n${colors.bold}Operating Mode: ${modeColor}${mode}${colors.reset}`)

  console.log('\n' + colors.dim + `Generated at: ${new Date().toISOString()}` + colors.reset + '\n')
}

main().catch(console.error)
