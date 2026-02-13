/**
 * CEO Control Tower Types
 * PR-2: Read-Only Display
 */

// Fetch result reasons
export type FetchReason =
  | 'ok'
  | 'index_unreachable'
  | 'index_timeout'
  | 'schema_invalid'
  | 'version_mismatch'

// Contract result from proof-pack
export interface ContractResult {
  id: string
  severity: 'P0' | 'P1' | 'P2'
  status: 'pass' | 'fail'
  metrics?: Record<string, unknown>
}

// Single run in proof-pack
export interface ProofRun {
  run_id: string
  commit?: string
  runtime_env?: string
  base_url?: string
  browser?: string
  timestamp?: string
  business_pass: boolean
  p0_summary: {
    total: number
    passed: number
    failed: number
    failed_ids: string[]
  }
  p0_required_missing: string[]
  p0_required_failed: string[]
  contracts: ContractResult[]
}

// proof-pack/index.json schema v1.1
export interface ProofIndex {
  version: string
  latest_run_id: string
  latest_business_pass: boolean
  generated_at: string // ISO 8601
  runs: ProofRun[]
}

// Stale status levels
export type StaleStatus = 'fresh' | 'stale' | 'critical_stale'

// App card for CEO dashboard
export interface AppCard {
  app: string
  label: string
  url: string
  ok: boolean
  reason: FetchReason
  business_pass: boolean
  latest_run_id: string | null
  commit: string | null
  p0_summary: {
    total: number
    passed: number
    failed: number
  } | null
  p0_missing: string[]
  p0_failed: string[]
  generated_at: string | null
  stale_status: StaleStatus
  contracts: ContractResult[]
}

// API response
export interface CEOAppsResponse {
  timestamp: string
  apps: AppCard[]
  summary: {
    total: number
    healthy: number
    failing: number
    unreachable: number
  }
}
