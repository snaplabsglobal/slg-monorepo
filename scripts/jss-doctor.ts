#!/usr/bin/env npx tsx
/**
 * JSS Doctor - Runtime Divergence Detection
 * SEOS Governance: local/dev convergence verification
 *
 * Usage:
 *   pnpm jss:doctor --target local
 *   pnpm jss:doctor --target dev
 *   pnpm jss:doctor --compare  # Compare local vs dev
 *
 * Exit codes:
 *   0 = All probes PASS
 *   1 = One or more probes FAIL
 */

import crypto from 'crypto'

// ============================================================================
// CONFIGURATION
// ============================================================================

const TARGETS = {
  local: 'http://localhost:3001',
  dev: 'https://jss-web-git-dev-snap-labs-global.vercel.app', // Vercel preview (DNS not configured)
  'dev-production': 'https://jss.snaplabs.global', // Will work once DNS is configured
} as const

type Target = keyof typeof TARGETS

interface RuntimeFingerprint {
  app: string
  git_sha: string
  build_id: string
  public_env_fingerprint: string
  feature_flags_fingerprint: string
  feature_flags: {
    photo_delete: boolean
    import: boolean
    smart_trace: boolean
  }
  sw: { expected_version: string }
  storage_targets: {
    supabase_url_hint: string
    r2_bucket_hint: string
  }
  env: string
  timestamp: string
}

interface ProbeResult {
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  reason?: string
  data?: unknown
}

interface DivergenceCheck {
  code: string
  status: 'PASS' | 'FAIL' | 'WARN'
  reason: string
}

// ============================================================================
// COLORS (for terminal output)
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

function pass(msg: string) { return `${colors.green}✓ PASS${colors.reset} ${msg}` }
function fail(msg: string) { return `${colors.red}✗ FAIL${colors.reset} ${msg}` }
function warn(msg: string) { return `${colors.yellow}⚠ WARN${colors.reset} ${msg}` }
function skip(msg: string) { return `${colors.blue}○ SKIP${colors.reset} ${msg}` }
function header(msg: string) { return `\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}` }

// ============================================================================
// RUNTIME FINGERPRINT
// ============================================================================

async function fetchRuntime(baseUrl: string): Promise<RuntimeFingerprint | null> {
  try {
    const res = await fetch(`${baseUrl}/api/__runtime`, { cache: 'no-store' })
    if (!res.ok) {
      console.error(fail(`Runtime endpoint returned ${res.status}`))
      return null
    }
    return await res.json()
  } catch (err) {
    console.error(fail(`Cannot reach ${baseUrl}/api/__runtime: ${(err as Error).message}`))
    return null
  }
}

// ============================================================================
// DIVERGENCE CHECKS
// ============================================================================

function checkWrongApp(runtime: RuntimeFingerprint): DivergenceCheck {
  if (runtime.app !== 'jss-web') {
    return {
      code: 'wrong_app',
      status: 'FAIL',
      reason: `Expected app=jss-web, got app=${runtime.app}`,
    }
  }
  return { code: 'wrong_app', status: 'PASS', reason: 'Correct app: jss-web' }
}

function checkEnvDrift(local: RuntimeFingerprint, remote: RuntimeFingerprint): DivergenceCheck {
  if (local.public_env_fingerprint !== remote.public_env_fingerprint) {
    return {
      code: 'env_drift',
      status: 'FAIL',
      reason: `public_env_fingerprint mismatch: local=${local.public_env_fingerprint} vs remote=${remote.public_env_fingerprint}`,
    }
  }
  if (local.feature_flags_fingerprint !== remote.feature_flags_fingerprint) {
    return {
      code: 'env_drift',
      status: 'WARN',
      reason: `feature_flags_fingerprint mismatch: local=${local.feature_flags_fingerprint} vs remote=${remote.feature_flags_fingerprint}`,
    }
  }
  return { code: 'env_drift', status: 'PASS', reason: 'Environment fingerprints match' }
}

function checkGitDrift(local: RuntimeFingerprint, remote: RuntimeFingerprint): DivergenceCheck {
  if (local.git_sha !== remote.git_sha) {
    return {
      code: 'git_drift',
      status: 'WARN',
      reason: `git_sha mismatch: local=${local.git_sha} vs remote=${remote.git_sha}`,
    }
  }
  return { code: 'git_drift', status: 'PASS', reason: `git_sha match: ${local.git_sha}` }
}

async function checkMockPathHit(baseUrl: string): Promise<DivergenceCheck> {
  const mockPaths = [
    '/api/mock-v2/photos',
    '/api/mock-v2/jobs',
    '/api/mock-v2/upload',
  ]

  for (const path of mockPaths) {
    try {
      const res = await fetch(`${baseUrl}${path}`, { method: 'GET', cache: 'no-store' })
      // If mock path returns anything other than 404, it's a problem
      if (res.status !== 404) {
        return {
          code: 'mock_path_hit',
          status: 'FAIL',
          reason: `${path} returned ${res.status} (expected 404 - mock should not exist)`,
        }
      }
    } catch {
      // Network error is OK - means endpoint doesn't exist
    }
  }

  return { code: 'mock_path_hit', status: 'PASS', reason: 'No mock-v2 paths active' }
}

// ============================================================================
// PROBES
// ============================================================================

async function probeUpload(baseUrl: string): Promise<ProbeResult> {
  try {
    // Create a 1KB test blob
    const testData = crypto.randomBytes(1024)
    const formData = new FormData()
    formData.append('file', new Blob([testData], { type: 'image/jpeg' }), 'doctor-test.jpg')
    formData.append('job_id', 'doctor-test-job')

    const res = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    })

    if (res.ok) {
      const data = await res.json()
      return {
        name: 'upload',
        status: 'PASS',
        reason: 'Upload successful',
        data: { photo_id: data.id || data.photo_id },
      }
    }

    return {
      name: 'upload',
      status: 'FAIL',
      reason: `Upload returned ${res.status}: ${await res.text()}`,
    }
  } catch (err) {
    return {
      name: 'upload',
      status: 'FAIL',
      reason: `Upload error: ${(err as Error).message}`,
    }
  }
}

async function probeList(baseUrl: string, photoId?: string): Promise<ProbeResult> {
  try {
    const res = await fetch(`${baseUrl}/api/jobs/doctor-test-job/photos`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return {
        name: 'list',
        status: 'FAIL',
        reason: `List returned ${res.status}`,
      }
    }

    const data = await res.json()
    const photos = data.photos || data || []

    if (photoId) {
      const found = photos.find((p: { id: string }) => p.id === photoId)
      if (!found) {
        return {
          name: 'list',
          status: 'FAIL',
          reason: `Uploaded photo ${photoId} not found in list`,
        }
      }
    }

    return {
      name: 'list',
      status: 'PASS',
      reason: `Found ${photos.length} photos`,
      data: { count: photos.length, photoId },
    }
  } catch (err) {
    return {
      name: 'list',
      status: 'FAIL',
      reason: `List error: ${(err as Error).message}`,
    }
  }
}

async function probeDelete(baseUrl: string, photoId: string): Promise<ProbeResult> {
  try {
    const res = await fetch(`${baseUrl}/api/jobs/doctor-test-job/photos/${photoId}`, {
      method: 'DELETE',
    })

    if (res.status === 404) {
      return {
        name: 'delete',
        status: 'SKIP',
        reason: 'Delete endpoint not found (feature may be disabled)',
      }
    }

    if (!res.ok) {
      return {
        name: 'delete',
        status: 'FAIL',
        reason: `Delete returned ${res.status}`,
      }
    }

    // Verify deletion
    const listRes = await fetch(`${baseUrl}/api/jobs/doctor-test-job/photos`, {
      cache: 'no-store',
    })
    const listData = await listRes.json()
    const photos = listData.photos || listData || []
    const stillExists = photos.find((p: { id: string }) => p.id === photoId)

    if (stillExists) {
      return {
        name: 'delete',
        status: 'FAIL',
        reason: `Photo ${photoId} still exists after delete`,
      }
    }

    return {
      name: 'delete',
      status: 'PASS',
      reason: `Photo ${photoId} successfully deleted`,
    }
  } catch (err) {
    return {
      name: 'delete',
      status: 'FAIL',
      reason: `Delete error: ${(err as Error).message}`,
    }
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function runDoctor(target: Target) {
  const baseUrl = TARGETS[target]
  console.log(header(`JSS Doctor - Target: ${target}`))
  console.log(`URL: ${baseUrl}`)
  console.log('')

  // 1. Fetch runtime fingerprint
  console.log(header('Runtime Fingerprint'))
  const runtime = await fetchRuntime(baseUrl)

  if (!runtime) {
    console.log(fail('Cannot fetch runtime fingerprint'))
    console.log('')
    console.log('Possible causes:')
    console.log('  - Server not running (for local)')
    console.log('  - DNS not configured (for dev)')
    console.log('  - /api/__runtime endpoint missing')
    process.exit(1)
  }

  console.log(`app: ${runtime.app}`)
  console.log(`git_sha: ${runtime.git_sha}`)
  console.log(`build_id: ${runtime.build_id}`)
  console.log(`public_env_fingerprint: ${runtime.public_env_fingerprint}`)
  console.log(`feature_flags_fingerprint: ${runtime.feature_flags_fingerprint}`)
  console.log(`feature_flags:`, runtime.feature_flags)
  console.log(`storage_targets:`, runtime.storage_targets)
  console.log(`env: ${runtime.env}`)

  // 2. Divergence checks (single target)
  console.log(header('Divergence Checks'))
  const checks: DivergenceCheck[] = []

  checks.push(checkWrongApp(runtime))
  checks.push(await checkMockPathHit(baseUrl))

  for (const check of checks) {
    if (check.status === 'PASS') console.log(pass(`[${check.code}] ${check.reason}`))
    else if (check.status === 'WARN') console.log(warn(`[${check.code}] ${check.reason}`))
    else console.log(fail(`[${check.code}] ${check.reason}`))
  }

  // 3. Probes
  console.log(header('Functional Probes'))

  const uploadResult = await probeUpload(baseUrl)
  if (uploadResult.status === 'PASS') console.log(pass(`[upload] ${uploadResult.reason}`))
  else if (uploadResult.status === 'SKIP') console.log(skip(`[upload] ${uploadResult.reason}`))
  else console.log(fail(`[upload] ${uploadResult.reason}`))

  let photoId = (uploadResult.data as { photo_id?: string })?.photo_id

  const listResult = await probeList(baseUrl, photoId)
  if (listResult.status === 'PASS') console.log(pass(`[list] ${listResult.reason}`))
  else if (listResult.status === 'SKIP') console.log(skip(`[list] ${listResult.reason}`))
  else console.log(fail(`[list] ${listResult.reason}`))

  let deleteResult: ProbeResult = { name: 'delete', status: 'SKIP', reason: 'No photo to delete' }
  if (photoId) {
    deleteResult = await probeDelete(baseUrl, photoId)
    if (deleteResult.status === 'PASS') console.log(pass(`[delete] ${deleteResult.reason}`))
    else if (deleteResult.status === 'SKIP') console.log(skip(`[delete] ${deleteResult.reason}`))
    else console.log(fail(`[delete] ${deleteResult.reason}`))
  } else {
    console.log(skip(`[delete] ${deleteResult.reason}`))
  }

  // 4. Summary
  console.log(header('Summary'))

  const allChecks = [...checks]
  const allProbes = [uploadResult, listResult, deleteResult]

  const failedChecks = allChecks.filter(c => c.status === 'FAIL')
  const failedProbes = allProbes.filter(p => p.status === 'FAIL')

  if (failedChecks.length === 0 && failedProbes.length === 0) {
    console.log(pass(`All checks passed for ${target}`))
    return { success: true, runtime }
  } else {
    console.log(fail(`${failedChecks.length} checks failed, ${failedProbes.length} probes failed`))
    return { success: false, runtime }
  }
}

async function runCompare() {
  console.log(header('JSS Doctor - Compare Mode'))
  console.log('Comparing local vs dev runtime fingerprints...')
  console.log('')

  const localResult = await runDoctor('local')
  console.log('')
  const devResult = await runDoctor('dev')

  if (!localResult.runtime || !devResult.runtime) {
    console.log('')
    console.log(fail('Cannot compare: one or both runtimes unavailable'))
    process.exit(1)
  }

  console.log(header('Comparison Results'))

  const gitCheck = checkGitDrift(localResult.runtime, devResult.runtime)
  const envCheck = checkEnvDrift(localResult.runtime, devResult.runtime)

  if (gitCheck.status === 'PASS') console.log(pass(`[git] ${gitCheck.reason}`))
  else if (gitCheck.status === 'WARN') console.log(warn(`[git] ${gitCheck.reason}`))
  else console.log(fail(`[git] ${gitCheck.reason}`))

  if (envCheck.status === 'PASS') console.log(pass(`[env] ${envCheck.reason}`))
  else if (envCheck.status === 'WARN') console.log(warn(`[env] ${envCheck.reason}`))
  else console.log(fail(`[env] ${envCheck.reason}`))

  const converged = gitCheck.status === 'PASS' && envCheck.status === 'PASS'

  console.log('')
  if (converged) {
    console.log(pass('CONVERGENCE: local and dev are aligned'))
  } else {
    console.log(fail('DIVERGENCE: local and dev have runtime differences'))
  }

  process.exit(converged && localResult.success && devResult.success ? 0 : 1)
}

// ============================================================================
// CLI
// ============================================================================

const args = process.argv.slice(2)
const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1] as Target | undefined
const isCompare = args.includes('--compare')

if (isCompare) {
  runCompare()
} else if (targetArg && TARGETS[targetArg]) {
  runDoctor(targetArg).then(result => {
    process.exit(result.success ? 0 : 1)
  })
} else {
  console.log('Usage:')
  console.log('  pnpm jss:doctor --target=local')
  console.log('  pnpm jss:doctor --target=dev')
  console.log('  pnpm jss:doctor --compare')
  process.exit(1)
}
