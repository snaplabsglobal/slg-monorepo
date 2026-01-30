/**
 * Fetch wrapper: when offline returns a fake response so callers can show cache/friendly message
 * instead of throwing "Failed to fetch".
 */

export type FetchWithOfflineResult = Response & { offline?: boolean }

export async function fetchWithOffline(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<FetchWithOfflineResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      ok: false,
      offline: true,
      status: 0,
      statusText: '',
      headers: new Headers(),
      redirected: false,
      type: 'basic',
      url: typeof input === 'string' ? input : input instanceof Request ? input.url : String(input),
      clone: () => ({}) as Response,
      body: null,
      bodyUsed: false,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      blob: () => Promise.resolve(new Blob()),
      formData: () => Promise.resolve(new FormData()),
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    } as FetchWithOfflineResult
  }
  return fetch(input, init) as Promise<FetchWithOfflineResult>
}
