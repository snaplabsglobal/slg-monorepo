/**
 * SEOS Domain Probe
 * Automated domain health checking for Domain Integrity scoring
 */

import domainRegistry from './registries/domain-registry.json'

export interface DomainProbeResult {
  domain: string
  url: string
  healthy: boolean
  responseTime: number
  statusCode: number | null
  error?: string
  timestamp: string
}

export interface AppProbeResult {
  app: string
  label: string
  status: 'paused' | 'active' | 'not_started'
  domains: DomainProbeResult[]
  healthyCount: number
  totalMonitored: number
}

export interface ProbeReport {
  schema: 'seos.domain-probe.v1'
  timestamp: string
  apps: AppProbeResult[]
  summary: {
    totalApps: number
    activeApps: number
    totalDomains: number
    healthyDomains: number
    averageResponseTime: number
  }
}

/**
 * Probe a single domain for health status
 */
export async function probeDomain(url: string, timeout: number = 5000): Promise<DomainProbeResult> {
  const startTime = Date.now()
  const probeUrl = url.replace(/\/$/, '') + '/api/proof-pack'

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(probeUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SEOS-Domain-Probe/1.0',
      },
    })

    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime

    // Check if response is JSON
    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    if (!response.ok || !isJson) {
      return {
        domain: new URL(url).hostname,
        url,
        healthy: false,
        responseTime,
        statusCode: response.status,
        error: !isJson ? 'Response is not JSON' : `HTTP ${response.status}`,
        timestamp: new Date().toISOString(),
      }
    }

    // Try to parse JSON
    try {
      const data = await response.json() as Record<string, unknown>
      const health = data.health as Record<string, unknown> | undefined
      const healthStatus = health?.status as string | undefined
      const isHealthy = healthStatus === 'HEALTHY' || healthStatus === 'DEGRADED'

      return {
        domain: new URL(url).hostname,
        url,
        healthy: isHealthy,
        responseTime,
        statusCode: response.status,
        timestamp: new Date().toISOString(),
      }
    } catch {
      return {
        domain: new URL(url).hostname,
        url,
        healthy: false,
        responseTime,
        statusCode: response.status,
        error: 'Invalid JSON response',
        timestamp: new Date().toISOString(),
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      domain: new URL(url).hostname,
      url,
      healthy: false,
      responseTime,
      statusCode: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

/**
 * Probe all monitored domains for an app
 */
export async function probeApp(
  appConfig: typeof domainRegistry.apps[0]
): Promise<AppProbeResult> {
  const status = (appConfig as { status?: string }).status as 'paused' | 'active' | 'not_started' | undefined

  if (status === 'paused' || status === 'not_started') {
    return {
      app: appConfig.app,
      label: appConfig.label,
      status: status,
      domains: [],
      healthyCount: 0,
      totalMonitored: 0,
    }
  }

  const monitoredDomains = appConfig.domains.filter(d => d.monitor)
  const results = await Promise.all(
    monitoredDomains.map(d => probeDomain(d.url))
  )

  return {
    app: appConfig.app,
    label: appConfig.label,
    status: 'active',
    domains: results,
    healthyCount: results.filter(r => r.healthy).length,
    totalMonitored: results.length,
  }
}

/**
 * Probe all domains in the registry
 */
export async function probeAllDomains(): Promise<ProbeReport> {
  const apps = await Promise.all(
    domainRegistry.apps.map(app => probeApp(app))
  )

  const activeApps = apps.filter(a => a.status === 'active')
  const allDomains = activeApps.flatMap(a => a.domains)
  const healthyDomains = allDomains.filter(d => d.healthy)
  const avgResponseTime = allDomains.length > 0
    ? Math.round(allDomains.reduce((sum, d) => sum + d.responseTime, 0) / allDomains.length)
    : 0

  return {
    schema: 'seos.domain-probe.v1',
    timestamp: new Date().toISOString(),
    apps,
    summary: {
      totalApps: domainRegistry.apps.length,
      activeApps: activeApps.length,
      totalDomains: allDomains.length,
      healthyDomains: healthyDomains.length,
      averageResponseTime: avgResponseTime,
    },
  }
}

/**
 * Get domain results formatted for metrics calculation
 */
export async function getDomainResultsForMetrics(): Promise<
  { domain: string; healthy: boolean; responseTime: number }[]
> {
  const report = await probeAllDomains()

  return report.apps
    .filter(a => a.status === 'active')
    .flatMap(a => a.domains)
    .map(d => ({
      domain: d.domain,
      healthy: d.healthy,
      responseTime: d.responseTime,
    }))
}
