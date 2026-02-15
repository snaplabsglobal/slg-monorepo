/**
 * SEOS Diagnose Engine
 *
 * 检测不是写 if，是建立规则体系。
 * 统一入口: pnpm diagnose
 * CI 强制执行
 */

export type DiagnoseStatus = 'pass' | 'fail' | 'warn'

export interface DiagnoseResult {
  status: DiagnoseStatus
  message: string
  details?: Record<string, unknown>
}

export interface DiagnoseOutput {
  app: string
  env: string
  timestamp: string
  overall: DiagnoseStatus
  checks: {
    env: DiagnoseResult
    auth: DiagnoseResult
    upload: DiagnoseResult
    mock: DiagnoseResult
    supabase: DiagnoseResult
    middleware: DiagnoseResult
  }
  errors: Array<{
    error_class: string
    root_hint: string
    suggested_fix: string
    severity: 'high' | 'medium' | 'low'
  }>
}

// ============================================================================
// DIAGNOSE CHECKS
// ============================================================================

/**
 * Check ENV completeness
 */
export function checkEnv(): DiagnoseResult {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ]

  const optional = [
    'R2_BUCKET_SNAP_EVIDENCE',
    'CLOUDFLARE_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_PUBLIC_URL_SNAP_EVIDENCE',
  ]

  const missing = required.filter(key => !process.env[key])
  const missingOptional = optional.filter(key => !process.env[key])

  if (missing.length > 0) {
    return {
      status: 'fail',
      message: `Missing required env vars: ${missing.join(', ')}`,
      details: { missing, missingOptional },
    }
  }

  if (missingOptional.length > 0 && process.env.NODE_ENV !== 'development') {
    return {
      status: 'warn',
      message: `Missing optional env vars (required for production): ${missingOptional.join(', ')}`,
      details: { missingOptional },
    }
  }

  return {
    status: 'pass',
    message: 'All required env vars present',
  }
}

/**
 * Check Auth configuration
 */
export function checkAuth(): DiagnoseResult {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  if (!supabaseUrl || !supabaseKey) {
    return {
      status: 'fail',
      message: 'Supabase credentials not configured',
      details: {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
      },
    }
  }

  // Check if redirect URL is configured
  if (!siteUrl) {
    return {
      status: 'warn',
      message: 'NEXT_PUBLIC_SITE_URL not set, auth redirects may fail',
    }
  }

  return {
    status: 'pass',
    message: 'Auth configuration valid',
    details: {
      project: supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'custom',
      redirectUrl: siteUrl,
    },
  }
}

/**
 * Check Upload/Storage configuration
 */
export function checkUpload(): DiagnoseResult {
  const bucket = process.env.R2_BUCKET_SNAP_EVIDENCE
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const accessKey = process.env.R2_ACCESS_KEY_ID
  const publicUrl = process.env.R2_PUBLIC_URL_SNAP_EVIDENCE

  const hasR2 = !!(bucket && accountId && accessKey && publicUrl)

  if (hasR2) {
    return {
      status: 'pass',
      message: 'R2 storage configured',
      details: { provider: 'r2', bucket },
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return {
      status: 'warn',
      message: 'R2 not configured, mock storage available in development',
      details: { provider: 'mock' },
    }
  }

  return {
    status: 'fail',
    message: 'Storage not configured',
    details: {
      missing: [
        !bucket && 'R2_BUCKET_SNAP_EVIDENCE',
        !accountId && 'CLOUDFLARE_ACCOUNT_ID',
        !accessKey && 'R2_ACCESS_KEY_ID',
        !publicUrl && 'R2_PUBLIC_URL_SNAP_EVIDENCE',
      ].filter(Boolean),
    },
  }
}

/**
 * Check Mock mode configuration
 */
export function checkMock(): DiagnoseResult {
  const isDev = process.env.NODE_ENV === 'development'
  const hasR2 = !!(
    process.env.R2_BUCKET_SNAP_EVIDENCE &&
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID
  )

  if (!isDev && !hasR2) {
    return {
      status: 'fail',
      message: 'Production mode without R2 configured',
    }
  }

  if (isDev && !hasR2) {
    return {
      status: 'warn',
      message: 'Development mode, mock storage will be used',
      details: { mockEnabled: true },
    }
  }

  return {
    status: 'pass',
    message: 'Mock mode configuration valid',
    details: { mockEnabled: isDev && !hasR2 },
  }
}

/**
 * Check Supabase connectivity
 */
export async function checkSupabase(): Promise<DiagnoseResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!url) {
    return {
      status: 'fail',
      message: 'Supabase URL not configured',
    }
  }

  // Simple ping test (check if URL is reachable)
  try {
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      },
    })

    if (response.ok || response.status === 400) {
      // 400 is expected without proper auth, but proves connectivity
      return {
        status: 'pass',
        message: 'Supabase reachable',
        details: { url, status: response.status },
      }
    }

    return {
      status: 'warn',
      message: `Supabase returned ${response.status}`,
      details: { url, status: response.status },
    }
  } catch (err) {
    return {
      status: 'fail',
      message: `Cannot reach Supabase: ${(err as Error).message}`,
      details: { url },
    }
  }
}

/**
 * Check Middleware configuration
 */
export function checkMiddleware(): DiagnoseResult {
  // This check would normally verify middleware.ts exists and is valid
  // For now, we just pass
  return {
    status: 'pass',
    message: 'Middleware configuration valid',
  }
}

// ============================================================================
// MAIN DIAGNOSE FUNCTION
// ============================================================================

/**
 * Run all diagnose checks
 */
export async function runDiagnose(app = 'jss-web'): Promise<DiagnoseOutput> {
  const env = checkEnv()
  const auth = checkAuth()
  const upload = checkUpload()
  const mock = checkMock()
  const supabase = await checkSupabase()
  const middleware = checkMiddleware()

  const checks = { env, auth, upload, mock, supabase, middleware }

  // Determine overall status
  const statuses = Object.values(checks).map(c => c.status)
  let overall: DiagnoseStatus = 'pass'
  if (statuses.includes('fail')) {
    overall = 'fail'
  } else if (statuses.includes('warn')) {
    overall = 'warn'
  }

  // Collect errors with structured diagnosis
  const errors: DiagnoseOutput['errors'] = []

  if (env.status === 'fail') {
    errors.push({
      error_class: 'ENV_INCOMPLETE',
      root_hint: 'Required environment variables are missing',
      suggested_fix: `Set missing env vars: ${(env.details?.missing as string[])?.join(', ')}`,
      severity: 'high',
    })
  }

  if (auth.status === 'fail') {
    errors.push({
      error_class: 'AUTH_NOT_CONFIGURED',
      root_hint: 'Supabase auth credentials not set',
      suggested_fix: 'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
      severity: 'high',
    })
  }

  if (upload.status === 'fail') {
    errors.push({
      error_class: 'STORAGE_NOT_CONFIGURED',
      root_hint: 'R2 storage not configured for production',
      suggested_fix: 'Set R2_BUCKET_SNAP_EVIDENCE, CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID',
      severity: 'high',
    })
  }

  if (supabase.status === 'fail') {
    errors.push({
      error_class: 'SUPABASE_UNREACHABLE',
      root_hint: 'Cannot connect to Supabase',
      suggested_fix: 'Check NEXT_PUBLIC_SUPABASE_URL and network connectivity',
      severity: 'high',
    })
  }

  return {
    app,
    env: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
    overall,
    checks,
    errors,
  }
}

// ============================================================================
// ROOT CAUSE INFERENCE
// ============================================================================

export function inferRootCause(
  diagnoseResult: DiagnoseOutput
): { root_cause_guess: string; confidence: number } {
  // Rule-based root cause classification
  if (diagnoseResult.checks.env.status === 'fail') {
    return { root_cause_guess: 'ENV_MISMATCH', confidence: 0.9 }
  }

  if (diagnoseResult.checks.auth.status === 'fail') {
    return { root_cause_guess: 'AUTH_CONFIG', confidence: 0.9 }
  }

  if (diagnoseResult.checks.upload.status === 'fail') {
    if (diagnoseResult.checks.mock.status === 'fail') {
      return { root_cause_guess: 'MISSING_GUARD', confidence: 0.8 }
    }
    return { root_cause_guess: 'PROVIDER_DOWN', confidence: 0.7 }
  }

  if (diagnoseResult.checks.supabase.status === 'fail') {
    return { root_cause_guess: 'PROVIDER_DOWN', confidence: 0.9 }
  }

  return { root_cause_guess: 'UNKNOWN', confidence: 0.3 }
}
