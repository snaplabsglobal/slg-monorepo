/**
 * Fetch wrapper: when offline returns { offline: true } so callers can show cache/friendly message
 * instead of throwing "Failed to fetch". Call sites must check ('offline' in res) before using
 * Response fields or calling res.json().
 */

export type FetchWithOfflineResult = { offline: true } | Response

export async function fetchWithOffline(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<FetchWithOfflineResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { offline: true }
  }
  return fetch(input, init)
}
