/**
 * CEO Control Tower - Stale Detection
 * PR-2: Data Freshness Tracking
 */

import type { StaleStatus } from './types'
import {
  STALE_THRESHOLD_HOURS,
  CRITICAL_STALE_THRESHOLD_HOURS,
} from './config'

/**
 * Calculate stale status based on generated_at timestamp
 */
export function getStaleStatus(generatedAt: string | null): StaleStatus {
  if (!generatedAt) {
    return 'critical_stale'
  }

  const generated = new Date(generatedAt)
  if (isNaN(generated.getTime())) {
    return 'critical_stale'
  }

  const now = new Date()
  const hoursAgo = (now.getTime() - generated.getTime()) / (1000 * 60 * 60)

  if (hoursAgo > CRITICAL_STALE_THRESHOLD_HOURS) {
    return 'critical_stale'
  }

  if (hoursAgo > STALE_THRESHOLD_HOURS) {
    return 'stale'
  }

  return 'fresh'
}

/**
 * Format time since last update for display
 */
export function formatTimeSince(generatedAt: string | null): string {
  if (!generatedAt) {
    return 'Unknown'
  }

  const generated = new Date(generatedAt)
  if (isNaN(generated.getTime())) {
    return 'Invalid date'
  }

  const now = new Date()
  const diffMs = now.getTime() - generated.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) {
    return 'Just now'
  }

  if (diffMins < 60) {
    return `${diffMins}m ago`
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  return `${diffDays}d ago`
}
