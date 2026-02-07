/**
 * SnapEvidence Sync Orchestrator
 * Manages when to trigger photo uploads based on various events
 *
 * Trigger points:
 * 1. Network comes online
 * 2. App becomes visible
 * 3. User enters photos page
 * 4. Photo taken (debounced)
 */

import { uploadQueue } from './upload-queue'
import { recoverOrphanedPhotos, getPendingCount } from './local-store'

type TriggerReason =
  | 'network_online'
  | 'app_visible'
  | 'photos_page_enter'
  | 'photo_taken'
  | 'manual'
  | 'app_start'

type SyncListener = (reason: TriggerReason, pendingCount: number) => void

class SyncOrchestrator {
  private recentTriggers: Set<TriggerReason> = new Set()
  private listeners: Set<SyncListener> = new Set()
  private initialized = false
  private photoTakenTimeout?: ReturnType<typeof setTimeout>

  // Throttle duration per reason (ms)
  private throttleDurations: Record<TriggerReason, number> = {
    network_online: 10000,      // 10 seconds
    app_visible: 30000,         // 30 seconds
    photos_page_enter: 60000,   // 1 minute
    photo_taken: 5000,          // 5 seconds
    manual: 0,                  // No throttle
    app_start: 0,               // No throttle
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
    })

    // Also track offline status
    window.addEventListener('offline', () => {
      console.log('Network offline - pausing uploads')
      uploadQueue.pause()
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
