import { runQueueOnce } from './worker'

let intervalId: ReturnType<typeof setInterval> | null = null

export function startQueueTriggers(): void {
  if (intervalId) return
  intervalId = setInterval(() => {
    void runQueueOnce()
  }, 30_000)
  window.addEventListener('online', () => void runQueueOnce())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void runQueueOnce()
  })
  void runQueueOnce()
}

export function stopQueueTriggers(): void {
  if (!intervalId) return
  clearInterval(intervalId)
  intervalId = null
}
