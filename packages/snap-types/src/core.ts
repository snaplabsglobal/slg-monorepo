/**
 * SLG Core Objects Types
 * Document: SLG_Strategy_Pivot_CTO_Brief_v1.4
 *
 * These are the 8 unified Core Objects used across all SLG apps:
 * 1. User (profiles)
 * 2. Workspace (organizations)
 * 3. Membership (organization_members)
 * 4. Property (core_property)
 * 5. Project/Job (projects/jobs)
 * 6. Contact (core_contact)
 * 7. Artifact (core_artifact)
 * 8. Event (core_event)
 */

// ============================================================================
// ULID Type (26-character time-sortable ID)
// ============================================================================

/**
 * ULID: Universally Unique Lexicographically Sortable Identifier
 * 26 characters, e.g., "01ARZ3NDEKTSV4RRFFQ69G5FAV"
 * Preferred over UUIDv4 for SLG (§2.1)
 */
export type ULID = string

// ============================================================================
// Money Types (§4.2)
// ============================================================================

/**
 * ISO 4217 currency codes
 * Note: Not limited to CAD - system is multi-currency ready
 */
export type CurrencyCode = 'CAD' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | string

/**
 * Money scale (precision factor)
 * - 100: cents (CAD, USD, EUR)
 * - 1: no decimals (JPY)
 * - 1000: fils (BHD, KWD)
 */
export type MoneyScale = 1 | 100 | 1000

/**
 * Transaction kind (§4.2.3)
 * - expense/income: >= 0
 * - refund/credit_note/void: <= 0
 */
export type TransactionKind = 'expense' | 'income' | 'refund' | 'credit_note' | 'void'

// ============================================================================
// Tax Types (§4.2.4)
// ============================================================================

export type TaxSystem = 'CA' | 'US' | 'OTHER'

export type TaxKind =
  | 'GST'
  | 'PST'
  | 'HST'
  | 'SALES_TAX'
  | 'STATE_SALES_TAX'
  | 'CITY_SALES_TAX'
  | 'COUNTY_SALES_TAX'
  | 'DISTRICT_SALES_TAX'
  | 'VAT'
  | 'OTHER'

export interface TaxLine {
  id: ULID
  transaction_id: string
  tax_system: TaxSystem
  tax_kind: TaxKind
  tax_cents: number
  rate_bps?: number // 100 = 1%, 500 = 5%
  taxable_base_cents?: number
  region_code?: string // CA-BC, US-WA
  locality?: string
  created_at: string
}

// ============================================================================
// Core Object: Property (§3.2)
// ============================================================================

export type PropertyType = 'residential' | 'commercial'

/**
 * Address source for confidence tracking
 * - canada_post: Canada Post AddressComplete API (highest confidence)
 * - google_places: Google Places API
 * - usps: USPS Address Validation (US)
 * - manual: User typed manually
 * - imported: Bulk import
 */
export type AddressSource = 'canada_post' | 'google_places' | 'usps' | 'manual' | 'imported'

/**
 * Signal status for fridge tag (反误报阀门)
 * - none: No signal activity
 * - candidate: First anomaly detected, awaiting confirmation
 * - confirmed: Second scan confirmed, ready to notify
 * - suppressed: User/system suppressed notifications
 */
export type SignalStatus = 'none' | 'candidate' | 'confirmed' | 'suppressed'

export interface Property {
  id: ULID
  organization_id: string

  // Country-aware address
  country_code: string // ISO-3166-1 alpha-2: "CA", "US"
  address_normalized: string // Standardized: uppercase, no punctuation
  address_raw?: string // Original user input
  unit?: string
  city?: string
  province_or_state?: string
  postal_code?: string

  // Address source and confidence (§ CPO refinement)
  address_source?: AddressSource
  address_confidence?: number // 0-100, API=90+, manual=50, imported=30

  // Cover image
  cover_artifact_id?: ULID

  // Fridge Tag (signal sensor)
  fridge_tag_id?: string

  // Signal status (反误报阀门)
  signal_status: SignalStatus
  signal_candidate_at?: string // First high_candidate trigger
  signal_confirmed_at?: string // Upgraded to high_confirmed

  // Metadata
  metadata: {
    schema_version: number
    property_type?: PropertyType
    [key: string]: unknown
  }

  // Audit
  created_at: string
  created_by_user_id?: string
  updated_at: string
  deleted_at?: string
}

// ============================================================================
// Core Object: Contact (§3.1)
// ============================================================================

export type ContactType =
  | 'homeowner'
  | 'realtor'
  | 'contractor'
  | 'subcontractor'
  | 'supplier'
  | 'other'

export interface Contact {
  id: ULID
  organization_id: string

  contact_type: ContactType
  display_name: string
  legal_name?: string
  company_name?: string
  email?: string
  phone?: string

  // Address
  address?: string
  city?: string
  province_or_state?: string
  postal_code?: string
  country_code?: string

  // Business identifiers
  business_number?: string
  gst_number?: string

  // Linked user
  primary_contact_user_id?: string

  // Metadata
  metadata: {
    schema_version: number
    [key: string]: unknown
  }

  // Audit
  created_at: string
  created_by_user_id?: string
  updated_at: string
  deleted_at?: string
}

// ============================================================================
// Core Object: Artifact (§3.4)
// ============================================================================

export type ArtifactKind =
  | 'photo'
  | 'receipt_image'
  | 'pdf'
  | 'plan'
  | 'video'
  | 'other'

export type StorageProvider = 'r2' | 's3'

export type SourceApp =
  | 'jss'
  | 'snappocket'
  | 'ledgersnap'
  | 'clientsnap'
  | 'portal'
  | 'fridge_tag'
  | 'system'

export interface CopyrightInfo {
  owner_type?: 'contractor' | 'realtor' | 'photographer'
  usage_scope?: 'technical' | 'marketing' | 'both'
  watermark_url?: string
}

export interface Artifact {
  id: ULID
  organization_id: string
  owner_user_id?: string

  // File info
  kind: ArtifactKind
  mime_type: string
  byte_size?: number
  sha256?: string // For dedup and tamper detection

  // Storage
  storage_provider: StorageProvider
  storage_key: string

  // Source
  source_app: SourceApp

  // Capture metadata (critical for offline evidence chain)
  captured_at?: string // Photo/receipt capture time, NOT upload time!
  geo_lat?: number
  geo_lng?: number
  device_id?: string
  device_local_time?: string
  tz_offset?: string // e.g., "-05:00"

  // Copyright (§8.4)
  copyright_info?: CopyrightInfo

  // Reference counting for sha256 dedup
  reference_count: number

  // Metadata
  metadata: {
    schema_version: number
    [key: string]: unknown
  }

  // Audit
  created_at: string
  deleted_at?: string
}

// ============================================================================
// Core Object: Event (§3.5)
// ============================================================================

/**
 * Event type naming: domain.object.action
 * Examples:
 *   - jss.photo.captured
 *   - sp.receipt.recognized
 *   - ls.transaction.created
 *   - ft.tag.scanned
 */
export type EventType = string

export interface EntityRef {
  entity: 'property' | 'project' | 'job' | 'artifact' | 'contact' | 'transaction'
  id: string
}

export interface Event {
  id: ULID
  organization_id: string

  // Actor (who triggered, NULL for anonymous like fridge tag scans)
  actor_user_id?: string

  // Source
  source_app: SourceApp

  // Event type
  type: EventType

  // Immutability (§2.7)
  immutable: boolean

  // Timestamps (§4.1)
  occurred_at: string // Event occurrence time, NOT creation time!
  created_at: string // DB write time, internal only
  device_local_time?: string
  tz_offset?: string

  // Denormalized for timeline queries
  property_id?: ULID
  project_id?: string // Can be UUID for legacy projects or ULID

  // Entity references (at least one required)
  entity_refs: EntityRef[]

  // Event-specific payload
  payload: {
    schema_version: number
    [key: string]: unknown
  }
}

/**
 * Immutable event types that cannot be deleted/updated
 * Must append *.corrected / *.voided instead
 *
 * CRITICAL: These event types are enforced at DB level via trigger.
 * Setting immutable=false for these types will be REJECTED.
 */
export const IMMUTABLE_EVENT_TYPES = [
  // Capture events (evidence chain)
  'jss.photo.captured',
  'sp.receipt.captured',
  // Upload events (evidence chain)
  'jss.photo.uploaded',
  'sp.receipt.uploaded',
  // Recognition events
  'sp.receipt.recognized',
  // Transaction events (financial)
  'ls.transaction.created',
  'ls.transaction.voided',
  // Invoice events (financial)
  'ls.invoice.sent',
  'ls.invoice.corrected',
  // Fridge tag events (signal)
  'ft.tag.scanned',
  'ft.signal.high_confirmed',
] as const

export type ImmutableEventType = (typeof IMMUTABLE_EVENT_TYPES)[number]

/**
 * Check if an event type is immutable by policy
 */
export function isImmutableEventType(type: string): type is ImmutableEventType {
  return (IMMUTABLE_EVENT_TYPES as readonly string[]).includes(type)
}

/**
 * Transaction kinds that allow negative amounts
 */
export const NEGATIVE_AMOUNT_KINDS: TransactionKind[] = ['refund', 'credit_note', 'void']

/**
 * Check if a transaction kind allows negative amounts
 */
export function allowsNegativeAmount(kind: TransactionKind): boolean {
  return NEGATIVE_AMOUNT_KINDS.includes(kind)
}

// ============================================================================
// Core Object: Share Grant (§3.6)
// ============================================================================

export type ShareScope = 'property' | 'project' | 'artifact_set' | 'event_set'
export type SharePermission = 'read_only' | 'comment' | 'upload_only'
export type RecipientType = 'link' | 'email' | 'user_id'

export interface ShareGrantAuditEntry {
  accessed_at: string
  ip?: string
  user_agent?: string
  resource?: string
}

export interface ShareGrant {
  id: ULID
  organization_id: string

  scope: ShareScope
  scope_id: string
  permissions: SharePermission

  recipient_type: RecipientType
  recipient_value: string

  expires_at?: string
  revoked_at?: string

  audit_log: ShareGrantAuditEntry[]

  created_at: string
  created_by_user_id?: string
}

// ============================================================================
// Core Object: Entity Link (for Property-Project-Contact associations)
// ============================================================================

export type EntityType = 'property' | 'project' | 'contact' | 'job'

export interface EntityLink {
  id: ULID
  organization_id: string

  entity_a_type: EntityType
  entity_a_id: string
  entity_b_type: EntityType
  entity_b_id: string

  link_type: string // e.g., 'property_project', 'project_contact'
  role?: string // e.g., 'homeowner', 'foreman'

  metadata: {
    schema_version: number
    [key: string]: unknown
  }

  created_at: string
  created_by_user_id?: string
  deleted_at?: string
}

// ============================================================================
// Fridge Tag Signal Types (§8.5)
// ============================================================================

export type SignalTier = 'low' | 'medium' | 'high_candidate' | 'high_confirmed'

export interface FridgeTagActivity {
  property_id: ULID
  last_scan_at?: string
  scan_count_30d: number
  scan_count_365d: number
  inactivity_days_before_last_scan: number
  signal_tier: SignalTier
}

/**
 * Fridge tag scan event payload
 */
export interface FridgeTagScanPayload {
  schema_version: number
  fridge_tag_id: string
  device_fingerprint_hash: string // Irreversible hash, for dedup only
  geo_lat?: number
  geo_lng?: number
  referrer: 'qr_scan' | 'deep_link' | 'nfc'
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Presigned URL response for artifact upload
 */
export interface ArtifactUploadRequest {
  idempotency_key: string // Client-generated, for retry safety
  kind: ArtifactKind
  mime_type: string
  byte_size: number
  sha256?: string // Optional, for dedup check
  captured_at: string // Required for evidence chain
  geo_lat?: number
  geo_lng?: number
  device_id?: string
  device_local_time?: string
  tz_offset?: string
}

export interface ArtifactUploadResponse {
  artifact_id: ULID
  upload_url: string // Presigned URL
  deduplicated: boolean // True if sha256 matched existing
  storage_key: string
  expires_at: string
}

/**
 * Timeline query parameters
 */
export interface TimelineQuery {
  property_id?: ULID
  project_id?: string
  limit?: number
  before?: string // occurred_at cursor for pagination
  event_types?: EventType[]
}

export interface TimelineResponse {
  events: Event[]
  has_more: boolean
  next_cursor?: string
}
