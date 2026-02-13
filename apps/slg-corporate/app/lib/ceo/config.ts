/**
 * CEO Control Tower Configuration
 * PR-2: App Registry
 */

export interface AppConfig {
  id: string
  label: string
  proofPackUrl: string
  productionUrl: string
}

// Registered apps for CEO Control Tower
export const CEO_APPS: AppConfig[] = [
  {
    id: 'jss',
    label: 'JobSite Snap',
    proofPackUrl: 'https://jss.snaplabs.global/proof-pack/index.json',
    productionUrl: 'https://jss.snaplabs.global',
  },
  {
    id: 'ls',
    label: 'LedgerSnap',
    proofPackUrl: 'https://ledgersnap.app/proof-pack/index.json',
    productionUrl: 'https://ledgersnap.app',
  },
  // PlanSnap will be added when ready
  // {
  //   id: 'plansnap',
  //   label: 'PlanSnap',
  //   proofPackUrl: 'https://plansnap.app/proof-pack/index.json',
  //   productionUrl: 'https://plansnap.app',
  // },
]

// Fetch timeout in milliseconds
export const FETCH_TIMEOUT_MS = 5000

// Stale thresholds (in hours)
export const STALE_THRESHOLD_HOURS = 12
export const CRITICAL_STALE_THRESHOLD_HOURS = 48

// Supported schema version
export const SUPPORTED_VERSION_MAJOR = 1
export const SUPPORTED_VERSION_MINOR_MIN = 0
export const SUPPORTED_VERSION_MINOR_MAX = 99
