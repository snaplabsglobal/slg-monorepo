/**
 * Rescue Mode Types
 *
 * Types for Photo Organizer / Self-Rescue Mode UI
 * Designed to show accurate data coverage and prevent "瞎编" scenarios
 */

export type RescueSummary = {
  totalPhotos: number
  likelyJobsite: number

  withTakenAt: number
  missingTakenAt: number
  takenAtRange?: { min: string; max: string } // ISO date

  withGps: number
  addressResolved: number
  addressLookupFailed?: number

  scanComplete: boolean
  analysisState: 'none' | 'partial' | 'complete'
  analysisCoverage?: { done: number; total: number }
}

export type JobSuggestion = {
  id: string
  displayName: string
  photoCount: number
  dateRange?: { min: string; max: string }
  basedOn: 'address' | 'gps' | 'time_cluster' | 'mixed'
  confidence: 'high' | 'medium' | 'low'

  isSampled?: boolean
  sampleSize?: number
  trueTotal?: number
}

export type RescueBuckets = {
  unknownLocation: { count: number }
  geocodeFailed?: { count: number }
  lowAccuracy?: { count: number }
  likelyPersonal?: { count: number }
  unsure?: { count: number }
}

export type RescueFilter =
  | 'likely_jobsite'
  | 'all'
  | 'unsure'
  | 'likely_personal'
