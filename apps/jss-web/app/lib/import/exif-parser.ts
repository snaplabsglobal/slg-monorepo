/**
 * Import Mode - EXIF Parser
 *
 * Batch EXIF parsing with progress callback.
 * Uses exifr library for GPS + DateTimeOriginal extraction.
 */

import exifr from 'exifr'

export interface PhotoExifData {
  file: File
  index: number
  lat: number | null
  lng: number | null
  timestamp: number | null // Unix timestamp in ms
  dateTimeOriginal: string | null
  fileSize: number
  error?: string
}

export interface ParseProgress {
  current: number
  total: number
  matched: number
  elapsedMs: number
}

/**
 * Parse EXIF data from a single file
 */
export async function parseExif(file: File, index: number): Promise<PhotoExifData> {
  try {
    // Extract only GPS and date/time tags for performance
    const exif = await exifr.parse(file, {
      gps: true,
      // Common date tags
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSLatitude', 'GPSLongitude'],
    })

    if (!exif) {
      return {
        file,
        index,
        lat: null,
        lng: null,
        timestamp: null,
        dateTimeOriginal: null,
        fileSize: file.size,
        error: 'No EXIF data',
      }
    }

    // Extract GPS
    const lat = exif.latitude ?? exif.GPSLatitude ?? null
    const lng = exif.longitude ?? exif.GPSLongitude ?? null

    // Extract timestamp (try multiple fields)
    let timestamp: number | null = null
    let dateTimeOriginal: string | null = null

    const dateField = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate
    if (dateField) {
      if (dateField instanceof Date) {
        timestamp = dateField.getTime()
        dateTimeOriginal = dateField.toISOString()
      } else if (typeof dateField === 'string') {
        // Try parsing EXIF date format: "2026:02:12 14:30:00"
        const parsed = new Date(dateField.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3'))
        if (!isNaN(parsed.getTime())) {
          timestamp = parsed.getTime()
          dateTimeOriginal = parsed.toISOString()
        }
      }
    }

    return {
      file,
      index,
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
      timestamp,
      dateTimeOriginal,
      fileSize: file.size,
    }
  } catch (error) {
    return {
      file,
      index,
      lat: null,
      lng: null,
      timestamp: null,
      dateTimeOriginal: null,
      fileSize: file.size,
      error: (error as Error).message,
    }
  }
}

/**
 * Parse EXIF data from multiple files in batches
 *
 * @param files - Array of File objects to parse
 * @param batchSize - Number of files to process per batch (default: 50)
 * @param onProgress - Callback for progress updates
 * @param signal - AbortSignal for cancellation
 */
export async function parseExifBatch(
  files: File[],
  batchSize: number = 50,
  onProgress?: (progress: ParseProgress) => void,
  signal?: AbortSignal
): Promise<PhotoExifData[]> {
  const results: PhotoExifData[] = []
  const startTime = Date.now()

  for (let i = 0; i < files.length; i += batchSize) {
    // Check for cancellation
    if (signal?.aborted) {
      throw new Error('Parsing cancelled')
    }

    const batch = files.slice(i, i + batchSize)

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map((file, batchIndex) => parseExif(file, i + batchIndex))
    )

    results.push(...batchResults)

    // Report progress
    if (onProgress) {
      const withGps = results.filter(r => r.lat !== null && r.lng !== null).length
      onProgress({
        current: results.length,
        total: files.length,
        matched: withGps, // Will be updated after filtering
        elapsedMs: Date.now() - startTime,
      })
    }

    // Yield to main thread between batches
    await new Promise(resolve => setTimeout(resolve, 0))
  }

  return results
}

/**
 * Get summary statistics from parsed EXIF data
 */
export function getExifStats(results: PhotoExifData[]): {
  total: number
  withGps: number
  withTimestamp: number
  withBoth: number
  missingGps: number
  missingTimestamp: number
  errors: number
  totalSizeBytes: number
} {
  let withGps = 0
  let withTimestamp = 0
  let withBoth = 0
  let errors = 0
  let totalSizeBytes = 0

  for (const result of results) {
    totalSizeBytes += result.fileSize

    if (result.error) {
      errors++
      continue
    }

    const hasGps = result.lat !== null && result.lng !== null
    const hasTimestamp = result.timestamp !== null

    if (hasGps) withGps++
    if (hasTimestamp) withTimestamp++
    if (hasGps && hasTimestamp) withBoth++
  }

  return {
    total: results.length,
    withGps,
    withTimestamp,
    withBoth,
    missingGps: results.length - withGps,
    missingTimestamp: results.length - withTimestamp,
    errors,
    totalSizeBytes,
  }
}
