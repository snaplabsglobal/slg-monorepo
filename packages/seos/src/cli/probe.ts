#!/usr/bin/env tsx
/**
 * SEOS Domain Probe CLI
 *
 * Usage: pnpm run probe
 *
 * Probes all domains in the domain registry and reports health status.
 */

import { probeAllDomains } from '../domain-probe'

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

async function main() {
  console.log('\n' + colors.bold + '╔════════════════════════════════════════════════════════════╗')
  console.log('║              SEOS Domain Probe v1.0                        ║')
  console.log('╚════════════════════════════════════════════════════════════╝' + colors.reset + '\n')

  console.log(colors.dim + 'Probing all domains...' + colors.reset + '\n')

  const report = await probeAllDomains()

  for (const app of report.apps) {
    console.log(colors.cyan + `┌── ${app.label} (${app.app}) ──────────────────────────────────────────┐` + colors.reset)

    if (app.status === 'paused') {
      console.log(`│  ${colors.yellow}PAUSED${colors.reset} - Domain monitoring paused`)
    } else if (app.status === 'not_started') {
      console.log(`│  ${colors.dim}NOT STARTED${colors.reset} - No domains configured`)
    } else {
      for (const domain of app.domains) {
        const statusIcon = domain.healthy ? colors.green + '✓' : colors.red + '✗'
        const responseTime = domain.healthy
          ? colors.dim + `${domain.responseTime}ms` + colors.reset
          : colors.red + (domain.error || 'FAILED') + colors.reset
        console.log(`│  ${statusIcon}${colors.reset} ${domain.domain.padEnd(30)} ${responseTime}`)
      }
      console.log(`│`)
      console.log(`│  Summary: ${app.healthyCount}/${app.totalMonitored} healthy`)
    }

    console.log(colors.cyan + '└──────────────────────────────────────────────────────────────┘' + colors.reset + '\n')
  }

  // Overall summary
  console.log(colors.bold + '═══ Summary ═══' + colors.reset)
  console.log(`Total Apps:     ${report.summary.totalApps}`)
  console.log(`Active Apps:    ${report.summary.activeApps}`)
  console.log(`Total Domains:  ${report.summary.totalDomains}`)
  console.log(`Healthy:        ${report.summary.healthyDomains}/${report.summary.totalDomains}`)
  console.log(`Avg Response:   ${report.summary.averageResponseTime}ms`)

  // Exit code based on health
  const allHealthy = report.summary.healthyDomains === report.summary.totalDomains
  console.log(`\n${allHealthy ? colors.green + '✓ All domains healthy' : colors.red + '✗ Some domains unhealthy'}${colors.reset}`)

  console.log('\n' + colors.dim + `Probed at: ${report.timestamp}` + colors.reset + '\n')

  process.exit(allHealthy ? 0 : 1)
}

main().catch((error) => {
  console.error(colors.red + 'Probe failed:', error + colors.reset)
  process.exit(1)
})
