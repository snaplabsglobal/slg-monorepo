/**
 * ULID (Universally Unique Lexicographically Sortable Identifier)
 *
 * Document: SLG_Strategy_Pivot_CTO_Brief_v1.4 §2.1
 *
 * ULID is the mandated ID format for all SLG Core Objects:
 * - 26 characters
 * - Time-sortable (first 10 chars encode timestamp)
 * - Readable and URL-safe
 *
 * Format: ttttttttttrrrrrrrrrrrrrrrr
 * - t: timestamp (10 chars, base32 Crockford)
 * - r: randomness (16 chars, base32 Crockford)
 */

// Crockford's Base32 alphabet (excludes I, L, O, U for readability)
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const ENCODING_LEN = 32
const TIME_LEN = 10
const RANDOM_LEN = 16
const ULID_LEN = TIME_LEN + RANDOM_LEN // 26

// Pre-computed decoding map
const DECODING: Record<string, number> = {}
for (let i = 0; i < ENCODING.length; i++) {
  const char = ENCODING[i]
  if (char) {
    DECODING[char] = i
    // Also support lowercase
    DECODING[char.toLowerCase()] = i
  }
}

/**
 * Generate a new ULID
 *
 * @param timestamp - Optional timestamp in milliseconds (defaults to now)
 * @returns A 26-character ULID string
 */
export function ulid(timestamp?: number): string {
  const time = timestamp ?? Date.now()
  return encodeTime(time) + encodeRandom()
}

/**
 * Encode timestamp to 10-char base32 string
 */
function encodeTime(timestamp: number): string {
  if (timestamp < 0 || timestamp > 0xffffffffffff) {
    throw new Error('ULID timestamp must be between 0 and 281474976710655')
  }

  let result = ''
  let t = timestamp

  for (let i = TIME_LEN - 1; i >= 0; i--) {
    result = ENCODING[t % ENCODING_LEN] + result
    t = Math.floor(t / ENCODING_LEN)
  }

  return result
}

/**
 * Encode 16 random characters
 */
function encodeRandom(): string {
  let result = ''

  // Use crypto for secure randomness if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(RANDOM_LEN)
    crypto.getRandomValues(bytes)
    for (let i = 0; i < RANDOM_LEN; i++) {
      const byte = bytes[i]
      result += ENCODING[byte !== undefined ? byte % ENCODING_LEN : 0]
    }
  } else {
    // Fallback to Math.random (less secure, but works everywhere)
    for (let i = 0; i < RANDOM_LEN; i++) {
      result += ENCODING[Math.floor(Math.random() * ENCODING_LEN)]
    }
  }

  return result
}

/**
 * Extract timestamp from a ULID
 *
 * @param id - A 26-character ULID string
 * @returns Timestamp in milliseconds
 */
export function ulidTime(id: string): number {
  if (id.length !== ULID_LEN) {
    throw new Error(`Invalid ULID: expected ${ULID_LEN} chars, got ${id.length}`)
  }

  const timeChars = id.substring(0, TIME_LEN)
  let time = 0

  for (let i = 0; i < TIME_LEN; i++) {
    const char = timeChars[i]
    if (!char) {
      throw new Error(`Invalid ULID: missing character at position ${i}`)
    }
    const value = DECODING[char]
    if (value === undefined) {
      throw new Error(`Invalid ULID character: ${char}`)
    }
    time = time * ENCODING_LEN + value
  }

  return time
}

/**
 * Extract Date from a ULID
 *
 * @param id - A 26-character ULID string
 * @returns Date object
 */
export function ulidDate(id: string): Date {
  return new Date(ulidTime(id))
}

/**
 * Validate a ULID string
 *
 * @param id - String to validate
 * @returns true if valid ULID format
 */
export function isValidUlid(id: string): boolean {
  if (typeof id !== 'string' || id.length !== ULID_LEN) {
    return false
  }

  for (let i = 0; i < ULID_LEN; i++) {
    const char = id[i]
    if (!char || DECODING[char] === undefined) {
      return false
    }
  }

  return true
}

/**
 * Compare two ULIDs for sorting
 *
 * @param a - First ULID
 * @param b - Second ULID
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareUlid(a: string, b: string): -1 | 0 | 1 {
  if (a === b) return 0
  // ULID is lexicographically sortable
  return a < b ? -1 : 1
}

/**
 * Generate a monotonic ULID factory
 *
 * Returns a function that generates ULIDs with guaranteed monotonically
 * increasing values within the same millisecond. This is useful for
 * high-throughput scenarios where multiple IDs may be generated in
 * the same millisecond.
 *
 * @returns A function that generates monotonic ULIDs
 */
export function monotonicFactory(): () => string {
  let lastTime = 0
  let lastRandom = ''

  return function monotonic(): string {
    const now = Date.now()

    if (now === lastTime) {
      // Same millisecond: increment the random portion
      lastRandom = incrementBase32(lastRandom)
      return encodeTime(now) + lastRandom
    }

    // New millisecond: generate fresh random
    lastTime = now
    lastRandom = encodeRandom()
    return encodeTime(now) + lastRandom
  }
}

/**
 * Increment a base32 string by 1
 */
function incrementBase32(s: string): string {
  const chars = s.split('')

  for (let i = chars.length - 1; i >= 0; i--) {
    const char = chars[i]
    if (!char) continue
    const value = DECODING[char]
    if (value === undefined) continue
    if (value < ENCODING_LEN - 1) {
      const nextChar = ENCODING[value + 1]
      if (nextChar) chars[i] = nextChar
      return chars.join('')
    }
    // Overflow: set to 0 and continue to next position
    const zeroChar = ENCODING[0]
    if (zeroChar) chars[i] = zeroChar
  }

  // All positions overflowed (extremely rare)
  // In practice, this would require 32^16 IDs in one millisecond
  throw new Error('ULID random overflow')
}

// Singleton monotonic factory for high-throughput use
const monotonicUlid = monotonicFactory()

/**
 * Generate a monotonic ULID (singleton)
 *
 * Use this instead of ulid() when generating many IDs quickly.
 * Guarantees monotonically increasing IDs within the same millisecond.
 */
export { monotonicUlid }
