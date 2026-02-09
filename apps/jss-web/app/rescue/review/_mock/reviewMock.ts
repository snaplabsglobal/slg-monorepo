/**
 * Review Page Types & Mock Data
 *
 * Types for Photo Organizer review buckets
 */

export type ReviewBucket =
  | 'unknownLocation'
  | 'geocodeFailed'
  | 'lowAccuracy'
  | 'likelyPersonal'
  | 'unsure'

export type ReviewPhoto = {
  id: string
  thumbUrl: string
  takenAtISO?: string
  hasGps: boolean
  reasonTags: string[] // Max 2 displayed
  score?: number // jobsite_score
}

export const bucketTitle: Record<ReviewBucket, string> = {
  unknownLocation: 'Unknown location',
  geocodeFailed: 'Address unresolved',
  lowAccuracy: 'Low accuracy location',
  likelyPersonal: 'Likely personal',
  unsure: 'Unsure',
}

export const bucketSubtitle: Record<ReviewBucket, string> = {
  unknownLocation: 'Missing GPS. Review and assign to a job if needed.',
  geocodeFailed: 'GPS available but address lookup failed. Review or retry.',
  lowAccuracy: 'Location accuracy is low. Review before grouping.',
  likelyPersonal:
    'Hidden by filter. You can keep them personal or re-include.',
  unsure: 'Needs a quick review. Confirm if these are jobsite photos.',
}
