/**
 * SnapEvidence Sync Orchestrator
 * Manages when to trigger photo uploads based on various events
 *
 * Trigger points:
 * 1. Network comes online
 * 2. App becomes visible
 * 3. User enters photos page
 * 4. Photo taken (debounced)
 *
 * Phase 1: Smart Trace Integration
 * - Smart Trace only runs when online
 * - Smart Trace is non-blocking (failure doesn't affect upload)
 * - Smart Trace suggestions require user confirmation
 */

import { uploadQueue } from './upload-queue'
import {
  recoverOrphanedPhotos,
  getPendingCount,
  initStorageCleanup,
  getPhotosForSmartTrace,
  updateAssignmentState,
} from './local-store'
import type { SmartTraceMeta } from './types'
import { SMART_TRACE_CONFIG } from './types'

type TriggerReason =
  | 'network_online'
  | 'app_visible'
  | 'photos_page_enter'
  | 'photo_taken'
  | 'manual'
  | 'app_start'
  | 'smart_trace'  // New trigger for Smart Trace

type SyncListener = (reason: TriggerReason, pendingCount: number) => void
type SmartTraceListener = (photoIds: string[], suggestions: Map<string, SmartTraceMeta>) => void

class SyncOrchestrator {
  private recentTriggers: Set<TriggerReason> = new Set()
  private listeners: Set<SyncListener> = new Set()
  private smartTraceListeners: Set<SmartTraceListener> = new Set()
  private initialized = false
  private photoTakenTimeout?: ReturnType<typeof setTimeout>
  private smartTraceTimeout?: ReturnType<typeof setTimeout>

  // Throttle duration per reason (ms)
  private throttleDurations: Record<TriggerReason, number> = {
    network_online: 10000,      // 10 seconds
    app_visible: 30000,         // 30 seconds
    photos_page_enter: 60000,   // 1 minute
    photo_taken: 5000,          // 5 seconds
    manual: 0,                  // No throttle
    app_start: 0,               // No throttle
    smart_trace: 30000,         // 30 seconds between Smart Trace runs
  }

  /**
   * Initialize the orchestrator
   * Call this once on app startup
   */
  async init() {
    if (this.initialized) return
    this.initialized = true

    // Recover orphaned photos from previous sessions
    await recoverOrphanedPhotos()

    // Phase 1.5: Clean up expired original blobs (7-day TTL)
    await initStorageCleanup()

    // Set up event listeners
    this.setupNetworkListener()
    this.setupVisibilityListener()

    // Trigger initial sync
    this.trigger('app_start')

    console.log('SyncOrchestrator initialized')
  }

  /**
   * Set up network status listener
   */
  private setupNetworkListener() {
    if (typeof window === 'undefined') return

    window.addEventListener('online', () => {
      console.log('Network online - triggering sync')
      this.trigger('network_online')

      // Smart Trace: Trigger after a short delay when network comes online
      // This allows uploads to start first, then Smart Trace runs in parallel
      if (this.smartTraceTimeout) {
        clearTimeout(this.smartTraceTimeout)
      }
      this.smartTraceTimeout = setTimeout(() => {
        this.triggerSmartTrace()
      }, 3000) // Wait 3 seconds after network online
    })

    // Also track offline status
    window.addEventListener('offline', () => {
      console.log('Network offline - pausing uploads')
      uploadQueue.pause()

      // Cancel any pending Smart Trace
      if (this.smartTraceTimeout) {
        clearTimeout(this.smartTraceTimeout)
        this.smartTraceTimeout = undefined
      }
    })

    // Resume if online
    if (navigator.onLine) {
      uploadQueue.resume()
    }
  }

  /**
   * Set up visibility change listener
   */
  private setupVisibilityListener() {
    if (typeof document === 'undefined') return

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        console.log('App visible - triggering sync')
        this.trigger('app_visible')
      }
    })
  }

  /**
   * Trigger sync with throttling
   */
  async trigger(reason: TriggerReason): Promise<void> {
    // Check throttle
    if (this.recentTriggers.has(reason) && reason !== 'manual') {
      return
    }

    // Add to recent triggers
    this.recentTriggers.add(reason)

    // Set throttle timer
    const duration = this.throttleDurations[reason]
    if (duration > 0) {
      setTimeout(() => {
        this.recentTriggers.delete(reason)
      }, duration)
    } else {
      this.recentTriggers.delete(reason)
    }

    // Check network status
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('Offline - sync deferred')
      return
    }

    // Notify listeners
    const pendingCount = await getPendingCount()
    this.notifyListeners(reason, pendingCount)

    // Start queue processing
    uploadQueue.resume()
    uploadQueue.processQueue()
  }

  /**
   * Called when a photo is taken
   * Debounced to avoid triggering on rapid burst shots
   */
  onPhotoTaken() {
    if (this.photoTakenTimeout) {
      clearTimeout(this.photoTakenTimeout)
    }

    this.photoTakenTimeout = setTimeout(() => {
      this.trigger('photo_taken')
    }, 5000) // Wait 5 seconds after last photo
  }

  /**
   * Called when user enters the photos/timeline page
   */
  onPhotosPageEnter() {
    this.trigger('photos_page_enter')
  }

  /**
   * Manual sync trigger (from UI button)
   */
  manualSync() {
    this.trigger('manual')
  }

  /**
   * Add sync event listener
   */
  addListener(listener: SyncListener) {
    this.listeners.add(listener)
  }

  /**
   * Remove sync event listener
   */
  removeListener(listener: SyncListener) {
    this.listeners.delete(listener)
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(reason: TriggerReason, pendingCount: number) {
    for (const listener of this.listeners) {
      try {
        listener(reason, pendingCount)
      } catch (e) {
        console.error('Sync listener error:', e)
      }
    }
  }

  /**
   * Get current sync status
   */
  async getStatus() {
    const pendingCount = await getPendingCount()
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isProcessing: uploadQueue.isProcessing(),
      runningCount: uploadQueue.getRunningCount(),
      pendingCount,
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SMART TRACE (Phase 1: Suggestion Only)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Add Smart Trace listener
   * Called when Smart Trace finds suggestions for photos
   */
  addSmartTraceListener(listener: SmartTraceListener) {
    this.smartTraceListeners.add(listener)
  }

  /**
   * Remove Smart Trace listener
   */
  removeSmartTraceListener(listener: SmartTraceListener) {
    this.smartTraceListeners.delete(listener)
  }

  /**
   * Trigger Smart Trace processing
   * Phase 1 Boundaries:
   * - Only runs when online
   * - Non-blocking: failure doesn't affect uploads
   * - Only SUGGESTS, never writes job_id
   */
  async triggerSmartTrace(): Promise<void> {
    // Check throttle
    if (this.recentTriggers.has('smart_trace')) {
      console.log('[SmartTrace] Throttled - skipping')
      return
    }

    // CRITICAL: Only run when online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[SmartTrace] Offline - not running')
      return
    }

    // Add to throttle
    this.recentTriggers.add('smart_trace')
    setTimeout(() => {
      this.recentTriggers.delete('smart_trace')
    }, this.throttleDurations.smart_trace)

    try {
      // Get photos eligible for Smart Trace
      const eligiblePhotos = await getPhotosForSmartTrace()

      if (eligiblePhotos.length === 0) {
        console.log('[SmartTrace] No eligible photos')
        return
      }

      console.log(`[SmartTrace] Processing ${eligiblePhotos.length} photos`)

      // Prepare request
      const photoCoords = eligiblePhotos
        .filter((p) => p.temp_coords)
        .map((p) => ({
          photo_id: p.id,
          lat: p.temp_coords!.lat,
          lng: p.temp_coords!.lng,
          accuracy_m: p.temp_coords!.accuracy_m,
        }))

      if (photoCoords.length === 0) {
        console.log('[SmartTrace] No photos with GPS coordinates')
        return
      }

      // Call Smart Trace API
      const response = await fetch('/api/smart-trace/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: photoCoords }),
      })

      if (!response.ok) {
        console.warn(`[SmartTrace] API error: ${response.status}`)
        return
      }

      const data = await response.json()
      const suggestions = data.suggestions || []

      // Process suggestions
      const suggestionsMap = new Map<string, SmartTraceMeta>()
      const photoIdsWithSuggestions: string[] = []

      for (const suggestion of suggestions) {
        if (suggestion.candidates && suggestion.candidates.length > 0) {
          // Take the best candidate (first one, closest distance)
          const best = suggestion.candidates[0]

          const meta: SmartTraceMeta = {
            suggested_job_id: best.job_id,
            suggested_job_name: best.job_name,
            distance_m: best.distance_m,
            confidence: best.confidence,
            suggested_at: new Date().toISOString(),
          }

          // Update photo state (suggestion only, NOT job_id)
          await updateAssignmentState(
            suggestion.photo_id,
            'suggested_by_smart_trace',
            meta
          )

          suggestionsMap.set(suggestion.photo_id, meta)
          photoIdsWithSuggestions.push(suggestion.photo_id)
        }
      }

      console.log(
        `[SmartTrace] Completed: ${photoIdsWithSuggestions.length} suggestions`
      )

      // Notify listeners
      if (photoIdsWithSuggestions.length > 0) {
        this.notifySmartTraceListeners(photoIdsWithSuggestions, suggestionsMap)
      }
    } catch (error) {
      // CRITICAL: Smart Trace failure is non-blocking
      // Log and continue - do not throw
      console.warn('[SmartTrace] Processing failed (non-blocking):', error)
    }
  }

  /**
   * Notify Smart Trace listeners
   */
  private notifySmartTraceListeners(
    photoIds: string[],
    suggestions: Map<string, SmartTraceMeta>
  ) {
    for (const listener of this.smartTraceListeners) {
      try {
        listener(photoIds, suggestions)
      } catch (e) {
        console.error('[SmartTrace] Listener error:', e)
      }
    }
  }

  /**
   * Force Smart Trace run (for testing or manual trigger)
   */
  async forceSmartTrace(): Promise<void> {
    this.recentTriggers.delete('smart_trace')
    await this.triggerSmartTrace()
  }
}

// Singleton instance
export const syncOrchestrator = new SyncOrchestrator()

// Auto-initialize when running in browser
if (typeof window !== 'undefined') {
  // Initialize after page load
  if (document.readyState === 'complete') {
    syncOrchestrator.init()
  } else {
    window.addEventListener('load', () => {
      syncOrchestrator.init()
    })
  }
}
