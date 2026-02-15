#!/usr/bin/env npx tsx
/**
 * SEOS Diagnose CLI
 *
 * Usage:
 *   pnpm diagnose
 *   pnpm --filter @slo/seos diagnose
 *
 * Output: Standard JSON to stdout
 * Exit code: 0 = pass, 1 = fail
 */

import { runDiagnose } from '../diagnose'

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

async function main() {
  const args = process.argv.slice(2)
  const jsonOnly = args.includes('--json')
  const app = args.find(a => a.startsWith('--app='))?.split('=')[1] || 'jss-web'

  const result = await runDiagnose(app)

  if (jsonOnly) {
    console.log(JSON.stringify(result, null, 2))
    process.exit(result.overall === 'fail' ? 1 : 0)
  }

  // Pretty print
  console.log(`${c.bold}${c.cyan}`)
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║                    SEOS DIAGNOSE ENGINE                      ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log(`${c.reset}`)

  console.log(`App: ${c.bold}${result.app}${c.reset}`)
  console.log(`Env: ${result.env}`)
  console.log(`Time: ${result.timestamp}`)
  console.log('')

  // Print checks
  for (const [name, check] of Object.entries(result.checks)) {
    const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗'
    const color = check.status === 'pass' ? c.green : check.status === 'warn' ? c.yellow : c.red
    console.log(`${color}${icon}${c.reset} ${name}: ${check.message}`)
  }

  console.log('')

  // Print errors
  if (result.errors.length > 0) {
    console.log(`${c.bold}Errors:${c.reset}`)
    for (const error of result.errors) {
      console.log(`  ${c.red}${error.error_class}${c.reset}`)
      console.log(`    ${c.dim}Root hint: ${error.root_hint}${c.reset}`)
      console.log(`    ${c.dim}Fix: ${error.suggested_fix}${c.reset}`)
    }
    console.log('')
  }

  // Overall status
  const overallColor = result.overall === 'pass' ? c.green : result.overall === 'warn' ? c.yellow : c.red
  const overallIcon = result.overall === 'pass' ? '✓' : result.overall === 'warn' ? '⚠' : '✗'
  console.log(`${c.bold}Overall: ${overallColor}${overallIcon} ${result.overall.toUpperCase()}${c.reset}`)

  process.exit(result.overall === 'fail' ? 1 : 0)
}

main().catch(err => {
  console.error('Diagnose failed:', err)
  process.exit(1)
})
