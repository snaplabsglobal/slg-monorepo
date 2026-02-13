/**
 * Event Service - Minimal Timeline Event Management
 *
 * Document: SLG_Strategy_Pivot_CTO_Brief_v1.4 §3.5
 *
 * MINIMAL SCOPE (Step 3):
 * ✅ Event write service
 * ✅ Immutable protection (via DB trigger)
 * ✅ Timeline query
 * ✅ Correction append model
 *
 * NOT in scope:
 * ❌ Dashboard, Analytics, Complex filtering, Search, Reports
 */

import { createClient } from '@/lib/supabase/server'
import { ulid } from '@slo/shared-utils'
import type { SourceApp, ULID } from '@slo/snap-types'

// ============================================================================
// Types
// ============================================================================

export interface EntityRef {
  entity: 'property' | 'project' | 'job' | 'artifact' | 'contact' | 'transaction'
  id: string
}

export interface WriteEventInput {
  organization_id: string
  actor_user_id?: string // Optional for anonymous events (fridge tag scans)
  source_app: SourceApp | 'fridge_tag' | 'system'
  type: string // domain.object.action format

  // Idempotency (for offline queue retry safety)
  idempotency_key?: string // ULID, client-generated

  // Time
  occurred_at: string // ISO timestamp - REQUIRED, event occurrence time
  device_local_time?: string
  tz_offset?: string

  // Entity refs (at least one required)
  entity_refs: EntityRef[]

  // Optional denormalized fields for fast timeline queries
  property_id?: string
  project_id?: string

  // Payload
  payload?: Record<string, unknown>

  // Immutability (auto-set by DB trigger for certain event types)
  immutable?: boolean
}

export interface EventRecord {
  id: ULID
  organization_id: string
  actor_user_id?: string
  source_app: string
  type: string
  immutable: boolean
  occurred_at: string
  created_at: string
  property_id?: string
  project_id?: string
  entity_refs: EntityRef[]
  payload?: Record<string, unknown>
}

export interface CorrectionInput {
  original_event_id: ULID
  organization_id: string
  actor_user_id: string
  source_app: SourceApp
  occurred_at: string
  reason: string
  corrected_payload: Record<string, unknown>
}

export interface TimelineQuery {
  organization_id: string
  property_id?: string
  project_id?: string
  cursor?: string // ULID of last event seen
  limit?: number // Default 50, max 100
}

export interface TimelineResult {
  events: EventRecord[]
  next_cursor?: string
  has_more: boolean
}

// ============================================================================
// Event Write Service
// ============================================================================

/**
 * Write a new event to the timeline
 *
 * Immutability is enforced by DB trigger for whitelisted event types:
 * - jss.photo.captured, jss.photo.uploaded
 * - sp.receipt.captured, sp.receipt.uploaded, sp.receipt.recognized
 * - ls.transaction.created, ls.transaction.voided
 * - ft.tag.scanned, ft.signal.high_confirmed
 *
 * Idempotency: If idempotency_key is provided, returns existing event on retry.
 */
export async function writeEvent(input: WriteEventInput): Promise<EventRecord> {
  const supabase = await createClient()

  // Validate entity_refs not empty
  if (!input.entity_refs || input.entity_refs.length === 0) {
    throw new Error('entity_refs must contain at least one reference')
  }

  // Validate type format (domain.object.action)
  if (!input.type.match(/^[a-z_]+\.[a-z_]+\.[a-z_]+$/)) {
    console.warn(`[Event] Non-standard event type format: ${input.type}`)
    // Don't throw - allow flexibility, but log warning
  }

  // Check idempotency if key provided
  if (input.idempotency_key) {
    const existing = await findEventByIdempotencyKey(
      input.organization_id,
      input.idempotency_key
    )
    if (existing) {
      // Idempotent: return existing event
      return existing
    }
  }

  const eventId = ulid()

  // Ensure payload has schema_version and idempotency_key
  const payload = {
    schema_version: 1,
    ...input.payload,
    ...(input.idempotency_key && { idempotency_key: input.idempotency_key }),
  }

  const eventRecord = {
    id: eventId,
    organization_id: input.organization_id,
    actor_user_id: input.actor_user_id,
    source_app: input.source_app,
    type: input.type,
    immutable: input.immutable ?? false, // DB trigger may override
    occurred_at: input.occurred_at,
    device_local_time: input.device_local_time,
    tz_offset: input.tz_offset,
    property_id: input.property_id || extractPropertyId(input.entity_refs),
    project_id: input.project_id || extractProjectId(input.entity_refs),
    entity_refs: input.entity_refs,
    payload,
  }

  const { data, error } = await supabase
    .from('core_event')
    .insert(eventRecord)
    .select()
    .single()

  if (error) {
    console.error('[Event Service] Write failed:', error)
    throw new Error(`Failed to write event: ${error.message}`)
  }

  return data as EventRecord
}

/**
 * Find an event by idempotency key (for retry safety)
 */
export async function findEventByIdempotencyKey(
  organizationId: string,
  idempotencyKey: string
): Promise<EventRecord | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('core_event')
    .select('*')
    .eq('organization_id', organizationId)
    .contains('payload', { idempotency_key: idempotencyKey })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    // Log but don't throw - allow operation to proceed
    console.warn('[Event Service] Idempotency check failed:', error)
    return null
  }

  return data as EventRecord
}

/**
 * Write a correction event for an immutable event
 *
 * Immutable events (evidence/financial) cannot be modified or deleted.
 * Instead, we write a new *.corrected event that references the original.
 *
 * The correction append model:
 * 1. Original event remains unchanged (immutable)
 * 2. New correction event links to original via corrects_event_id
 * 3. Timeline displays show latest correction
 */
export async function writeCorrectionEvent(
  input: CorrectionInput
): Promise<EventRecord> {
  const supabase = await createClient()

  // Fetch original event
  const { data: original, error: fetchError } = await supabase
    .from('core_event')
    .select('*')
    .eq('id', input.original_event_id)
    .eq('organization_id', input.organization_id)
    .single()

  if (fetchError || !original) {
    throw new Error(`Original event not found: ${input.original_event_id}`)
  }

  // Verify original is immutable (only immutable events need corrections)
  if (!original.immutable) {
    throw new Error('Correction events are only for immutable events. Use update instead.')
  }

  // Derive correction event type (e.g., sp.receipt.recognized → sp.receipt.corrected)
  const typeParts = original.type.split('.')
  if (typeParts.length !== 3) {
    throw new Error(`Invalid original event type format: ${original.type}`)
  }
  const correctionType = `${typeParts[0]}.${typeParts[1]}.corrected`

  const eventId = ulid()

  const correctionPayload = {
    schema_version: 1,
    corrects_event_id: input.original_event_id,
    correction_reason: input.reason,
    original_payload: original.payload,
    corrected_payload: input.corrected_payload,
  }

  const eventRecord = {
    id: eventId,
    organization_id: input.organization_id,
    actor_user_id: input.actor_user_id,
    source_app: input.source_app,
    type: correctionType,
    immutable: true, // Corrections are also immutable
    occurred_at: input.occurred_at,
    property_id: original.property_id,
    project_id: original.project_id,
    entity_refs: [
      ...original.entity_refs,
      { entity: 'event' as const, id: input.original_event_id },
    ],
    payload: correctionPayload,
  }

  const { data, error } = await supabase
    .from('core_event')
    .insert(eventRecord)
    .select()
    .single()

  if (error) {
    console.error('[Event Service] Correction write failed:', error)
    throw new Error(`Failed to write correction event: ${error.message}`)
  }

  return data as EventRecord
}

// ============================================================================
// Timeline Query
// ============================================================================

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

/**
 * Query timeline events for a property or project
 *
 * Simple cursor-based pagination using ULID ordering.
 * Returns events in reverse chronological order (newest first).
 */
export async function queryTimeline(query: TimelineQuery): Promise<TimelineResult> {
  const supabase = await createClient()

  // Validate: must have property_id or project_id
  if (!query.property_id && !query.project_id) {
    throw new Error('Either property_id or project_id is required')
  }

  const limit = Math.min(query.limit || DEFAULT_LIMIT, MAX_LIMIT)

  let dbQuery = supabase
    .from('core_event')
    .select('*')
    .eq('organization_id', query.organization_id)
    .order('occurred_at', { ascending: false })
    .order('id', { ascending: false }) // Secondary sort by ULID for stability
    .limit(limit + 1) // Fetch one extra to detect has_more

  // Filter by property or project
  if (query.property_id) {
    dbQuery = dbQuery.eq('property_id', query.property_id)
  } else if (query.project_id) {
    dbQuery = dbQuery.eq('project_id', query.project_id)
  }

  // Cursor-based pagination
  if (query.cursor) {
    // Cursor is the ULID of the last seen event
    // Fetch events with occurred_at <= cursor's occurred_at, but id < cursor
    // For simplicity, we use the ULID directly (time-sortable)
    dbQuery = dbQuery.lt('id', query.cursor)
  }

  const { data, error } = await dbQuery

  if (error) {
    console.error('[Event Service] Timeline query failed:', error)
    throw new Error(`Failed to query timeline: ${error.message}`)
  }

  const events = data || []
  const hasMore = events.length > limit

  // Remove the extra event used for has_more detection
  if (hasMore) {
    events.pop()
  }

  return {
    events: events as EventRecord[],
    next_cursor: hasMore && events.length > 0 ? events[events.length - 1].id : undefined,
    has_more: hasMore,
  }
}

/**
 * Get a single event by ID
 */
export async function getEvent(
  eventId: ULID,
  organizationId: string
): Promise<EventRecord | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('core_event')
    .select('*')
    .eq('id', eventId)
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to get event: ${error.message}`)
  }

  return data as EventRecord
}

/**
 * Get the latest correction for an event (if any)
 */
export async function getLatestCorrection(
  originalEventId: ULID,
  organizationId: string
): Promise<EventRecord | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('core_event')
    .select('*')
    .eq('organization_id', organizationId)
    .contains('payload', { corrects_event_id: originalEventId })
    .order('occurred_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // No correction found
    }
    throw new Error(`Failed to get correction: ${error.message}`)
  }

  return data as EventRecord
}

// ============================================================================
// Helper Functions
// ============================================================================

function extractPropertyId(refs: EntityRef[]): string | undefined {
  const propertyRef = refs.find((r) => r.entity === 'property')
  return propertyRef?.id
}

function extractProjectId(refs: EntityRef[]): string | undefined {
  const projectRef = refs.find((r) => r.entity === 'project' || r.entity === 'job')
  return projectRef?.id
}
