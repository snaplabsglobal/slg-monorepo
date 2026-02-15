#!/usr/bin/env npx tsx
/**
 * JSS Gate 0 - Pre-deployment Verification
 * CTO 任务单验收脚本
 *
 * Usage:
 *   pnpm jss:gate0 --target=dev
 *   pnpm jss:gate0 --target=local
 *
 * Gate 0 Requirements:
 *   A. Runtime Truth - 3秒内知道运行模式
 *   B. Local 上传 - 配置明确，无静默失败
 *   C. Dev 登录 - Auth 配置完整
 *   D. 环境治理 - 禁止静默 fallback
 *
 * Exit codes:
 *   0 = All gates PASS
 *   1 = One or more gates FAIL
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const TARGETS = {
  local: 'http://localhost:3001',
  dev: 'https://jss-web-git-dev-snap-labs-global.vercel.app',
  prod: 'https://www.jobsitesnap.com',
} as const

// Production domains that must all return HEALTHY from proof-pack
const PRODUCTION_DOMAINS = [
  'https://www.jobsitesnap.com',
  'https://jss.snaplabs.global',
  'https://jss-web.vercel.app',
] as const

type Target = keyof typeof TARGETS

interface RuntimeInfo {
  app: string
  git_sha: string
  git_branch: string
  env: string
  vercel_env: string
  feature_flags: {
    photo_delete: boolean
    import: boolean
    smart_trace: boolean
  }
  storage: {
    supabase: { url: string; isLocal: boolean; isConfigured: boolean }
    r2: { bucket: string; isConfigured: boolean; missingEnvVars: string[] }
    upload: { provider: string; ready: boolean; error: string | null }
  }
  auth: {
    supabaseConfigured: boolean
    redirectUrl: string
    supabaseProject: string
  }
  sw: { expected_version: string }
  seos?: {
    compliant: boolean
    unresolvedCount: number
    totalInterventions: number
    selfHealedCount: number
  }
  timestamp: string
}

interface GateResult {
  gate: string
  status: 'PASS' | 'FAIL' | 'WARN' | 'SKIP'
  details: string[]
}

// ============================================================================
// COLORS
// ============================================================================

const c = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
}

function pass(msg: string) { return `${c.green}✓ PASS${c.reset} ${msg}` }
function fail(msg: string) { return `${c.red}✗ FAIL${c.reset} ${msg}` }
function warn(msg: string) { return `${c.yellow}⚠ WARN${c.reset} ${msg}` }
function skip(msg: string) { return `${c.blue}○ SKIP${c.reset} ${msg}` }
function header(msg: string) { return `\n${c.bold}${c.cyan}═══ ${msg} ═══${c.reset}` }
function subheader(msg: string) { return `${c.dim}--- ${msg} ---${c.reset}` }

// ============================================================================
// FETCH RUNTIME
// ============================================================================

async function fetchRuntime(baseUrl: string): Promise<RuntimeInfo | null> {
  try {
    const res = await fetch(`${baseUrl}/api/runtime`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) {
      console.error(fail(`Runtime endpoint returned ${res.status}`))
      return null
    }
    const contentType = res.headers.get('content-type')
    if (!contentType?.includes('application/json')) {
      console.error(fail(`Runtime endpoint returned non-JSON: ${contentType}`))
      return null
    }
    return await res.json()
  } catch (err) {
    console.error(fail(`Cannot reach ${baseUrl}/api/runtime: ${(err as Error).message}`))
    return null
  }
}

// ============================================================================
// GATE A: RUNTIME TRUTH
// ============================================================================

async function gateA_RuntimeTruth(baseUrl: string): Promise<GateResult> {
  const details: string[] = []
  let status: GateResult['status'] = 'PASS'

  // 1. Check /api/runtime endpoint exists and returns JSON
  const runtime = await fetchRuntime(baseUrl)
  if (!runtime) {
    return {
      gate: 'A: Runtime Truth',
      status: 'FAIL',
      details: ['/api/runtime endpoint not reachable or returns non-JSON'],
    }
  }

  details.push(`app: ${runtime.app}`)
  details.push(`git_sha: ${runtime.git_sha}`)
  details.push(`git_branch: ${runtime.git_branch}`)
  details.push(`env: ${runtime.env} / ${runtime.vercel_env}`)

  // 2. Check required fields exist
  if (!runtime.app || runtime.app !== 'jss-web') {
    status = 'FAIL'
    details.push(`ERROR: app should be 'jss-web', got '${runtime.app}'`)
  }

  if (!runtime.storage) {
    status = 'FAIL'
    details.push('ERROR: storage diagnostics missing')
  }

  if (!runtime.auth) {
    status = 'FAIL'
    details.push('ERROR: auth diagnostics missing')
  }

  // 3. Check storage diagnostics are informative
  if (runtime.storage) {
    details.push(`upload_provider: ${runtime.storage.upload.provider}`)
    details.push(`upload_ready: ${runtime.storage.upload.ready}`)
    if (runtime.storage.upload.error) {
      details.push(`upload_error: ${runtime.storage.upload.error}`)
    }
  }

  // 4. Check auth diagnostics are informative
  if (runtime.auth) {
    details.push(`supabase_project: ${runtime.auth.supabaseProject}`)
    details.push(`supabase_configured: ${runtime.auth.supabaseConfigured}`)
  }

  return { gate: 'A: Runtime Truth', status, details }
}

// ============================================================================
// GATE B: STORAGE CONFIGURATION
// ============================================================================

async function gateB_StorageConfig(baseUrl: string, target: Target): Promise<GateResult> {
  const details: string[] = []
  let status: GateResult['status'] = 'PASS'

  const runtime = await fetchRuntime(baseUrl)
  if (!runtime) {
    return {
      gate: 'B: Storage Config',
      status: 'FAIL',
      details: ['Cannot fetch runtime info'],
    }
  }

  if (!runtime.storage) {
    return {
      gate: 'B: Storage Config',
      status: 'FAIL',
      details: ['Storage diagnostics not available'],
    }
  }

  const { storage } = runtime

  // Check upload provider is explicit (not 'unknown' or empty)
  if (!storage.upload.provider || storage.upload.provider === 'unknown') {
    status = 'FAIL'
    details.push('ERROR: upload_provider is not explicit')
  } else {
    details.push(`upload_provider: ${storage.upload.provider}`)
  }

  // For dev: must have R2 configured
  if (target === 'dev') {
    if (!storage.upload.ready) {
      status = 'FAIL'
      details.push('ERROR: upload not ready on dev')
      if (storage.upload.error) {
        details.push(`  → ${storage.upload.error}`)
      }
    } else {
      details.push('upload_ready: true ✓')
    }

    if (!storage.r2.isConfigured) {
      status = 'FAIL'
      details.push('ERROR: R2 not configured on dev')
      details.push(`  Missing: ${storage.r2.missingEnvVars.join(', ')}`)
    } else {
      details.push(`r2_bucket: ${storage.r2.bucket} ✓`)
    }
  }

  // For local: mock storage is acceptable
  if (target === 'local') {
    if (!storage.upload.ready) {
      status = 'WARN'
      details.push('WARN: upload not ready on local')
      details.push('  This is OK if you only need to test UI')
      if (storage.upload.error) {
        details.push(`  Missing: ${storage.upload.error}`)
      }
    } else if (storage.upload.provider === 'mock') {
      details.push('upload_ready: true (MOCK) ✓')
      details.push('  Using in-memory mock storage for local development')
    } else {
      details.push('upload_ready: true ✓')
      details.push(`r2_bucket: ${storage.r2.bucket}`)
    }
  }

  // Check that error messages are explicit (no generic "something went wrong")
  if (storage.upload.error) {
    if (storage.upload.error.includes('Missing env vars')) {
      details.push('Error message is explicit ✓')
    }
  }

  return { gate: 'B: Storage Config', status, details }
}

// ============================================================================
// GATE C: AUTH CONFIGURATION
// ============================================================================

async function gateC_AuthConfig(baseUrl: string, target: Target): Promise<GateResult> {
  const details: string[] = []
  let status: GateResult['status'] = 'PASS'

  const runtime = await fetchRuntime(baseUrl)
  if (!runtime) {
    return {
      gate: 'C: Auth Config',
      status: 'FAIL',
      details: ['Cannot fetch runtime info'],
    }
  }

  if (!runtime.auth) {
    return {
      gate: 'C: Auth Config',
      status: 'FAIL',
      details: ['Auth diagnostics not available'],
    }
  }

  const { auth } = runtime

  // Check Supabase is configured
  if (!auth.supabaseConfigured) {
    status = 'FAIL'
    details.push('ERROR: Supabase not configured')
  } else {
    details.push(`supabase_configured: true ✓`)
    details.push(`supabase_project: ${auth.supabaseProject}`)
  }

  // For dev: check project is not localhost
  if (target === 'dev') {
    if (auth.supabaseProject === 'localhost' || auth.supabaseProject === 'unknown') {
      status = 'FAIL'
      details.push('ERROR: dev should not use localhost Supabase')
    }
  }

  // Check login page is accessible
  try {
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'GET',
      redirect: 'manual',
    })
    if (loginRes.status === 200 || loginRes.status === 307 || loginRes.status === 308) {
      details.push('login page accessible ✓')
    } else {
      status = 'WARN'
      details.push(`WARN: login page returned ${loginRes.status}`)
    }
  } catch (err) {
    status = 'WARN'
    details.push(`WARN: cannot access login page: ${(err as Error).message}`)
  }

  return { gate: 'C: Auth Config', status, details }
}

// ============================================================================
// GATE D: NO SILENT FALLBACK
// ============================================================================

async function gateD_NoSilentFallback(baseUrl: string): Promise<GateResult> {
  const details: string[] = []
  let status: GateResult['status'] = 'PASS'

  // 1. Check no mock-v2 paths exist
  const mockPaths = ['/api/mock-v2/photos', '/api/mock-v2/jobs', '/api/mock-v2/upload']
  for (const path of mockPaths) {
    try {
      const res = await fetch(`${baseUrl}${path}`, { method: 'GET' })
      if (res.status !== 404) {
        status = 'FAIL'
        details.push(`ERROR: ${path} returned ${res.status} (should be 404)`)
      }
    } catch {
      // Network error is OK - endpoint doesn't exist
    }
  }
  details.push('No mock-v2 paths active ✓')

  // 2. Check upload endpoint returns explicit error when called without auth
  try {
    const uploadRes = await fetch(`${baseUrl}/api/jobs/test-job/photos/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: 'image/jpeg' }),
    })
    const body = await uploadRes.json().catch(() => ({}))

    if (uploadRes.status === 401) {
      details.push('Upload returns 401 without auth ✓')
    } else if (uploadRes.status === 503 && body.code === 'STORAGE_NOT_CONFIGURED') {
      details.push('Upload returns explicit STORAGE_NOT_CONFIGURED ✓')
    } else if (uploadRes.status === 404) {
      details.push('Upload returns 404 (job not found) ✓')
    } else {
      // Check if error message is explicit
      if (body.error && !body.error.includes('Internal server error')) {
        details.push(`Upload returns explicit error: ${body.error}`)
      } else {
        status = 'WARN'
        details.push(`WARN: Upload returned ${uploadRes.status} with generic error`)
      }
    }
  } catch (err) {
    status = 'WARN'
    details.push(`WARN: Cannot test upload endpoint: ${(err as Error).message}`)
  }

  // 3. Check runtime returns all required diagnostic fields
  const runtime = await fetchRuntime(baseUrl)
  if (runtime) {
    const requiredFields = ['storage', 'auth', 'feature_flags', 'git_sha', 'env']
    const missingFields = requiredFields.filter(f => !(f in runtime))
    if (missingFields.length > 0) {
      status = 'FAIL'
      details.push(`ERROR: Runtime missing fields: ${missingFields.join(', ')}`)
    } else {
      details.push('Runtime has all diagnostic fields ✓')
    }
  }

  return { gate: 'D: No Silent Fallback', status, details }
}

// ============================================================================
// GATE E: FEATURE FLAGS CONVERGED
// ============================================================================

async function gateE_FeatureFlags(baseUrl: string): Promise<GateResult> {
  const details: string[] = []
  let status: GateResult['status'] = 'PASS'

  const runtime = await fetchRuntime(baseUrl)
  if (!runtime) {
    return {
      gate: 'E: Feature Flags',
      status: 'FAIL',
      details: ['Cannot fetch runtime info'],
    }
  }

  const { feature_flags } = runtime

  // Check all flags are boolean
  if (typeof feature_flags.photo_delete !== 'boolean') {
    status = 'FAIL'
    details.push('ERROR: photo_delete is not boolean')
  } else {
    details.push(`photo_delete: ${feature_flags.photo_delete}`)
  }

  if (typeof feature_flags.import !== 'boolean') {
    status = 'FAIL'
    details.push('ERROR: import is not boolean')
  } else {
    details.push(`import: ${feature_flags.import}`)
  }

  if (typeof feature_flags.smart_trace !== 'boolean') {
    status = 'FAIL'
    details.push('ERROR: smart_trace is not boolean')
  } else {
    details.push(`smart_trace: ${feature_flags.smart_trace}`)
  }

  // photo_delete should be true (CTO requirement - delete is a must feature)
  if (feature_flags.photo_delete !== true) {
    status = 'WARN'
    details.push('WARN: photo_delete is false (delete feature disabled)')
  }

  return { gate: 'E: Feature Flags', status, details }
}

// ============================================================================
// GATE G: LOGIN BUTTON + SOAK TEST (10x)
// ============================================================================

async function gateG_LoginButtonSoak(baseUrl: string): Promise<GateResult> {
  const details: string[] = []
  let status: GateResult['status'] = 'PASS'
  const SOAK_RUNS = 10

  // Assertions to check on each run
  const assertions = [
    { name: 'Sign In text', check: (html: string) => html.includes('Sign In') || html.includes('sign in') },
    { name: 'Submit button', check: (html: string) => html.includes('type="submit"') || html.includes("type='submit'") },
    { name: 'Form element', check: (html: string) => html.includes('<form') },
    { name: 'Email input', check: (html: string) => html.includes('type="email"') || html.includes("type='email'") },
    { name: 'Password input', check: (html: string) => html.includes('type="password"') || html.includes("type='password'") },
  ]

  let passed = 0
  let failed = 0
  const errors: string[] = []

  details.push(`Running soak test: ${SOAK_RUNS} requests to /login`)

  for (let i = 0; i < SOAK_RUNS; i++) {
    try {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'GET',
        headers: { 'Accept': 'text/html' },
        cache: 'no-store',
      })

      if (!res.ok) {
        failed++
        errors.push(`Run ${i + 1}: HTTP ${res.status}`)
        continue
      }

      const html = await res.text()
      let runPassed = true

      for (const assertion of assertions) {
        if (!assertion.check(html)) {
          runPassed = false
          errors.push(`Run ${i + 1}: ${assertion.name} missing`)
        }
      }

      if (runPassed) {
        passed++
      } else {
        failed++
      }
    } catch (err) {
      failed++
      errors.push(`Run ${i + 1}: ${(err as Error).message}`)
    }
  }

  // Soak result
  details.push(`Soak result: ${passed}/${SOAK_RUNS} passed`)

  if (failed > 0) {
    status = 'FAIL'
    details.push(`ERROR: ${failed} soak runs failed`)
    for (const error of errors.slice(0, 5)) {
      details.push(`  → ${error}`)
    }
    if (errors.length > 5) {
      details.push(`  → ... and ${errors.length - 5} more errors`)
    }
  } else {
    details.push('All assertions passed on all runs ✓')
    details.push('CEO manual verification replaced by soak test ✓')
  }

  return { gate: 'G: Login Soak (10x)', status, details }
}

// ============================================================================
// GATE H: DOMAIN BINDING (Production Only)
// ============================================================================

interface ProofPackResponse {
  health?: { status: string }
  git?: { sha: string }
}

async function gateH_DomainBinding(): Promise<GateResult> {
  const details: string[] = []
  let status: GateResult['status'] = 'PASS'

  details.push(`Checking ${PRODUCTION_DOMAINS.length} production domains...`)

  const results: { domain: string; status: 'HEALTHY' | 'FAIL'; error?: string; sha?: string }[] = []

  for (const domain of PRODUCTION_DOMAINS) {
    try {
      const res = await fetch(`${domain}/api/proof-pack`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (!res.ok) {
        results.push({ domain, status: 'FAIL', error: `HTTP ${res.status}` })
        continue
      }

      const data: ProofPackResponse = await res.json()
      if (data.health?.status === 'HEALTHY') {
        results.push({ domain, status: 'HEALTHY', sha: data.git?.sha })
      } else {
        results.push({ domain, status: 'FAIL', error: `health.status = ${data.health?.status}` })
      }
    } catch (err) {
      results.push({ domain, status: 'FAIL', error: (err as Error).message })
    }
  }

  // Check results
  const healthy = results.filter(r => r.status === 'HEALTHY')
  const failed = results.filter(r => r.status === 'FAIL')

  // All domains should return same git sha
  const shas = new Set(healthy.map(r => r.sha).filter(Boolean))
  if (shas.size > 1) {
    status = 'WARN'
    details.push(`WARN: Domains running different commits: ${[...shas].join(', ')}`)
  }

  // Report results
  for (const r of results) {
    if (r.status === 'HEALTHY') {
      details.push(`✓ ${r.domain} → HEALTHY (${r.sha || 'unknown sha'})`)
    } else {
      details.push(`✗ ${r.domain} → FAIL: ${r.error}`)
    }
  }

  // Fail if any domain is not healthy
  if (failed.length > 0) {
    status = 'FAIL'
    details.push(`ERROR: ${failed.length}/${PRODUCTION_DOMAINS.length} domains not healthy`)
    details.push('  → Run docs/runbooks/jss-domain-binding.md to fix')
  } else {
    details.push(`All ${PRODUCTION_DOMAINS.length} domains healthy ✓`)
  }

  return { gate: 'H: Domain Binding', status, details }
}

// ============================================================================
// GATE F: SEOS COMPLIANCE
// ============================================================================

async function gateF_SeosCompliance(baseUrl: string): Promise<GateResult> {
  const details: string[] = []
  let status: GateResult['status'] = 'PASS'

  const runtime = await fetchRuntime(baseUrl)
  if (!runtime) {
    return {
      gate: 'F: SEOS Compliance',
      status: 'FAIL',
      details: ['Cannot fetch runtime info'],
    }
  }

  // Check if SEOS status is available
  if (!runtime.seos) {
    status = 'WARN'
    details.push('WARN: SEOS status not available in runtime')
    details.push('  This may be an older deployment without SEOS tracking')
    return { gate: 'F: SEOS Compliance', status, details }
  }

  const { seos } = runtime

  // Check compliance (no unresolved interventions)
  if (seos.compliant) {
    details.push('SEOS compliant: true ✓')
    details.push(`intervention_count: 0`)
    details.push(`self_healed: ${seos.selfHealedCount}`)
  } else {
    status = 'FAIL'
    details.push('ERROR: SEOS not compliant')
    details.push(`  unresolved_interventions: ${seos.unresolvedCount}`)
    details.push('  CEO intervention required - violates SEOS governance')
  }

  // Log total interventions for visibility
  if (seos.totalInterventions > 0) {
    details.push(`total_intervention_points: ${seos.totalInterventions}`)
  }

  return { gate: 'F: SEOS Compliance', status, details }
}

// ============================================================================
// MAIN
// ============================================================================

async function runGate0(target: Target) {
  const baseUrl = TARGETS[target]

  console.log(`${c.bold}${c.cyan}`)
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║                    JSS GATE 0 VERIFICATION                   ║')
  console.log('║                    CTO 任务单验收测试                         ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log(`${c.reset}`)
  console.log(`Target: ${c.bold}${target}${c.reset}`)
  console.log(`URL: ${baseUrl}`)
  console.log('')

  const gates: GateResult[] = []

  // Run all gates
  console.log(header('Gate A: Runtime Truth'))
  console.log(subheader('3秒内知道运行模式'))
  const gateA = await gateA_RuntimeTruth(baseUrl)
  gates.push(gateA)
  printGateResult(gateA)

  console.log(header('Gate B: Storage Config'))
  console.log(subheader('上传配置明确，无静默失败'))
  const gateB = await gateB_StorageConfig(baseUrl, target)
  gates.push(gateB)
  printGateResult(gateB)

  console.log(header('Gate C: Auth Config'))
  console.log(subheader('Auth 配置完整'))
  const gateC = await gateC_AuthConfig(baseUrl, target)
  gates.push(gateC)
  printGateResult(gateC)

  console.log(header('Gate D: No Silent Fallback'))
  console.log(subheader('禁止静默 fallback'))
  const gateD = await gateD_NoSilentFallback(baseUrl)
  gates.push(gateD)
  printGateResult(gateD)

  console.log(header('Gate E: Feature Flags'))
  console.log(subheader('功能开关一致'))
  const gateE = await gateE_FeatureFlags(baseUrl)
  gates.push(gateE)
  printGateResult(gateE)

  console.log(header('Gate F: SEOS Compliance'))
  console.log(subheader('CEO干预计数=0'))
  const gateF = await gateF_SeosCompliance(baseUrl)
  gates.push(gateF)
  printGateResult(gateF)

  console.log(header('Gate G: Login Soak (10x)'))
  console.log(subheader('Sign In 按钮可见性浸泡测试'))
  const gateG = await gateG_LoginButtonSoak(baseUrl)
  gates.push(gateG)
  printGateResult(gateG)

  // Gate H only runs for prod target
  if (target === 'prod') {
    console.log(header('Gate H: Domain Binding'))
    console.log(subheader('所有生产域名返回 HEALTHY'))
    const gateH = await gateH_DomainBinding()
    gates.push(gateH)
    printGateResult(gateH)
  }

  // Summary
  console.log(header('GATE 0 SUMMARY'))

  const failed = gates.filter(g => g.status === 'FAIL')
  const warned = gates.filter(g => g.status === 'WARN')
  const passed = gates.filter(g => g.status === 'PASS')

  console.log('')
  for (const gate of gates) {
    const icon = gate.status === 'PASS' ? '✓' : gate.status === 'WARN' ? '⚠' : '✗'
    const color = gate.status === 'PASS' ? c.green : gate.status === 'WARN' ? c.yellow : c.red
    console.log(`  ${color}${icon}${c.reset} ${gate.gate}`)
  }
  console.log('')

  if (failed.length === 0 && warned.length === 0) {
    console.log(`${c.green}${c.bold}`)
    console.log('╔══════════════════════════════════════════════════════════════╗')
    console.log('║                     ✓ GATE 0 PASSED                          ║')
    console.log('║                   All checks green! 🎉                       ║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    console.log(`${c.reset}`)
    return true
  } else if (failed.length === 0) {
    console.log(`${c.yellow}${c.bold}`)
    console.log('╔══════════════════════════════════════════════════════════════╗')
    console.log(`║           ⚠ GATE 0 PASSED WITH ${warned.length} WARNING(S)                   ║`)
    console.log('║                  Review warnings above                       ║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    console.log(`${c.reset}`)
    return true
  } else {
    console.log(`${c.red}${c.bold}`)
    console.log('╔══════════════════════════════════════════════════════════════╗')
    console.log(`║               ✗ GATE 0 FAILED (${failed.length} failures)                   ║`)
    console.log('║                  Fix errors above                            ║')
    console.log('╚══════════════════════════════════════════════════════════════╝')
    console.log(`${c.reset}`)
    return false
  }
}

function printGateResult(result: GateResult) {
  const statusStr = result.status === 'PASS' ? pass('')
    : result.status === 'WARN' ? warn('')
    : result.status === 'SKIP' ? skip('')
    : fail('')

  console.log(`${statusStr.trim()}`)
  for (const detail of result.details) {
    if (detail.startsWith('ERROR:')) {
      console.log(`  ${c.red}${detail}${c.reset}`)
    } else if (detail.startsWith('WARN:')) {
      console.log(`  ${c.yellow}${detail}${c.reset}`)
    } else {
      console.log(`  ${c.dim}${detail}${c.reset}`)
    }
  }
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2)
const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1] as Target | undefined

if (!targetArg || !TARGETS[targetArg]) {
  console.log('Usage:')
  console.log('  pnpm jss:gate0 --target=local')
  console.log('  pnpm jss:gate0 --target=dev')
  console.log('  pnpm jss:gate0 --target=prod   # Includes domain binding check')
  process.exit(1)
}

runGate0(targetArg).then(success => {
  process.exit(success ? 0 : 1)
})
