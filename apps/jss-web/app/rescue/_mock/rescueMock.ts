/**
 * Mock data for Rescue Mode
 *
 * Numbers designed to be self-explaining:
 * - 1160 total photos
 * - 320 with GPS → 280 resolved address, 40 failed
 * - 840 missing GPS → unknownLocation bucket
 * - 80 likely personal (filtered out from likelyJobsite count)
 */

import type {
  RescueSummary,
  JobSuggestion,
  RescueBuckets,
} from './rescue.types'

export const rescueSummaryMock: RescueSummary = {
  totalPhotos: 1160,
  likelyJobsite: 1080,

  withTakenAt: 1020,
  missingTakenAt: 140,
  takenAtRange: {
    min: '2021-07-01',
    max: '2022-11-30',
  },

  withGps: 320,
  addressResolved: 280,
  addressLookupFailed: 40,

  scanComplete: true,
  analysisState: 'partial',
  analysisCoverage: { done: 280, total: 1160 },
}

export const jobSuggestionsMock: JobSuggestion[] = [
  {
    id: 'sug_van_cambie_5862',
    displayName: 'Vancouver – 5862 Cambie St',
    photoCount: 360,
    dateRange: {
      min: '2021-07-01',
      max: '2021-08-31',
    },
    basedOn: 'address',
    confidence: 'high',
  },
  {
    id: 'sug_bby_kingsway_8290',
    displayName: 'Burnaby – 8290 Kingsway',
    photoCount: 360,
    dateRange: {
      min: '2022-03-01',
      max: '2022-04-30',
    },
    basedOn: 'address',
    confidence: 'high',
  },
  {
    id: 'sug_bby_kingsway_4700',
    displayName: 'Burnaby – 4700 Kingsway',
    photoCount: 360,
    dateRange: {
      min: '2022-11-01',
      max: '2022-11-30',
    },
    basedOn: 'address',
    confidence: 'medium',
  },
]

// Data accountability check:
// 1160 total
// - 320 with GPS
//   - 280 resolved address → suggestions
//   - 40 failed → geocodeFailed
// - 840 missing GPS → unknownLocation
//
// likelyJobsite 1080 (filtered out 80 personal)
export const rescueBucketsMock: RescueBuckets = {
  unknownLocation: { count: 840 },
  geocodeFailed: { count: 40 },
  lowAccuracy: { count: 0 },
  likelyPersonal: { count: 80 },
  unsure: { count: 120 },
}
