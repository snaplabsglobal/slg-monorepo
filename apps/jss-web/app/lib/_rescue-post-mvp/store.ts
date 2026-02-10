/**
 * Self-Rescue Mode Store
 *
 * State management for the rescue wizard flow
 * Core principle: "Nothing changes unless you confirm"
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  RescueSession,
  RescuePhoto,
  PhotoGroupSuggestion,
  BuildingBucket,
  RescueSessionSegment,
  UnitId,
  BucketUIState,
  RescuePlan,
} from './types'
import { NamingState } from './types'
import {
  computeMajorityAndMinority,
  getSessionDisplayState,
} from './clustering'

// ═══════════════════════════════════════════════════════════════════════════
// STORE STATE
// ═══════════════════════════════════════════════════════════════════════════

type RescueStep =
  | 'landing'
  | 'source'
  | 'scanning'
  | 'groups'
  | 'naming'
  | 'confirm'
  | 'applied'

interface RescueState {
  // Current step
  step: RescueStep

  // Session
  session: RescueSession | null

  // ============================================================
  // Scan API state
  // scanId: null = stateless mode (DB 写入失败，只有建议可用)
  // ============================================================
  scanId: string | null
  stateless: boolean

  // Photos (loaded from user's device)
  photos: RescuePhoto[]

  // Grouping results
  groups: PhotoGroupSuggestion[]
  buckets: BuildingBucket[]
  unlocatedPhotoIds: string[]
  noisePhotoIds: string[]

  // Naming state per group
  groupNamingState: Record<string, NamingState>
  groupNames: Record<string, string>

  // Photo assignments (for multi-unit)
  photoAssignment: Record<string, UnitId>

  // Session assignments
  sessionAssignments: Record<string, UnitId>

  // Bucket UI state (sticky destination etc.)
  bucketUIState: Record<string, BucketUIState>

  // Scan progress
  scanProgress: {
    total: number
    processed: number
    withGps: number
    withoutGps: number
  }

  // Errors
  error: string | null

  // Loading states
  isScanning: boolean
  isGrouping: boolean
  isApplying: boolean
}

interface RescueActions {
  // Navigation
  goToStep: (step: RescueStep) => void
  reset: () => void

  // Session
  startSession: (sessionId: string, userId: string) => void

  // Scan API state
  setScanId: (scanId: string | null) => void
  setStateless: (stateless: boolean) => void

  // Photos
  addPhotos: (photos: RescuePhoto[]) => void
  clearPhotos: () => void

  // Scanning
  setScanProgress: (progress: Partial<RescueState['scanProgress']>) => void
  setIsScanning: (value: boolean) => void

  // Grouping
  setGroups: (groups: PhotoGroupSuggestion[]) => void
  setBuckets: (buckets: BuildingBucket[]) => void
  setUnlocatedPhotoIds: (ids: string[]) => void
  setNoisePhotoIds: (ids: string[]) => void
  setIsGrouping: (value: boolean) => void

  // Naming
  setGroupNamingState: (groupId: string, state: NamingState) => void
  setGroupName: (groupId: string, name: string) => void

  // Session assignment (one-tap)
  assignSession: (sessionId: string, unitId: UnitId) => void
  getSessionDisplayState: (
    sessionId: string
  ) => 'assigned' | 'mixed' | 'unassigned'

  // Photo assignment
  assignPhotos: (photoIds: string[], unitId: UnitId) => void

  // Bucket UI state
  setBucketUIState: (bucketId: string, state: Partial<BucketUIState>) => void
  getStickyDestination: (bucketId: string) => UnitId | undefined

  // Auto-pick minority
  getMinoritySelection: (sessionId: string) => {
    autoPick: boolean
    selected: string[]
    majorityUnit: UnitId
    majorityRatio: number
  }

  // Move selected photos
  moveSelectedToUnit: (photoIds: string[], unitId: UnitId, bucketId: string) => void

  // Split session
  splitToNewSession: (
    bucketId: string,
    sourceSessionId: string,
    photoIds: string[]
  ) => string // returns new session ID

  // Plan generation
  generatePlan: () => RescuePlan

  // Apply
  applyPlan: () => Promise<void>
  setIsApplying: (value: boolean) => void

  // Error
  setError: (error: string | null) => void
}

// ═══════════════════════════════════════════════════════════════════════════
// INITIAL STATE
// ═══════════════════════════════════════════════════════════════════════════

const initialState: RescueState = {
  step: 'landing',
  session: null,
  scanId: null,
  stateless: false,
  photos: [],
  groups: [],
  buckets: [],
  unlocatedPhotoIds: [],
  noisePhotoIds: [],
  groupNamingState: {},
  groupNames: {},
  photoAssignment: {},
  sessionAssignments: {},
  bucketUIState: {},
  scanProgress: {
    total: 0,
    processed: 0,
    withGps: 0,
    withoutGps: 0,
  },
  error: null,
  isScanning: false,
  isGrouping: false,
  isApplying: false,
}

// ═══════════════════════════════════════════════════════════════════════════
// STORE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export const useRescueStore = create<RescueState & RescueActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Navigation
      goToStep: (step) => set({ step }),

      reset: () => set(initialState),

      // Session
      startSession: (sessionId, userId) =>
        set({
          session: {
            sessionId,
            userId,
            createdAt: new Date().toISOString(),
            status: 'created',
          },
          step: 'source',
        }),

      // Scan API state
      setScanId: (scanId) => set({ scanId }),
      setStateless: (stateless) => set({ stateless }),

      // Photos
      addPhotos: (photos) =>
        set((state) => ({
          photos: [...state.photos, ...photos],
        })),

      clearPhotos: () => set({ photos: [] }),

      // Scanning
      setScanProgress: (progress) =>
        set((state) => ({
          scanProgress: { ...state.scanProgress, ...progress },
        })),

      setIsScanning: (value) => set({ isScanning: value }),

      // Grouping
      setGroups: (groups) => set({ groups }),
      setBuckets: (buckets) => set({ buckets }),
      setUnlocatedPhotoIds: (ids) => set({ unlocatedPhotoIds: ids }),
      setNoisePhotoIds: (ids) => set({ noisePhotoIds: ids }),
      setIsGrouping: (value) => set({ isGrouping: value }),

      // Naming
      setGroupNamingState: (groupId, namingState) =>
        set((state) => ({
          groupNamingState: {
            ...state.groupNamingState,
            [groupId]: namingState,
          },
        })),

      setGroupName: (groupId, name) =>
        set((state) => ({
          groupNames: {
            ...state.groupNames,
            [groupId]: name,
          },
        })),

      // Session assignment
      assignSession: (sessionId, unitId) => {
        const state = get()

        // Find the session
        let targetSession: RescueSessionSegment | null = null
        for (const bucket of state.buckets) {
          const session = bucket.sessions.find((s) => s.sessionId === sessionId)
          if (session) {
            targetSession = session
            break
          }
        }

        if (!targetSession) return

        // Update all photo assignments for this session
        const newPhotoAssignment = { ...state.photoAssignment }
        for (const pid of targetSession.photoIds) {
          newPhotoAssignment[pid] = unitId
        }

        // Update session assignment
        const newSessionAssignments = {
          ...state.sessionAssignments,
          [sessionId]: unitId,
        }

        // Update bucketUIState.lastUsedUnitId
        let bucketId = ''
        for (const bucket of state.buckets) {
          if (bucket.sessions.some((s) => s.sessionId === sessionId)) {
            bucketId = bucket.bucketId
            break
          }
        }

        const newBucketUIState = { ...state.bucketUIState }
        if (bucketId) {
          newBucketUIState[bucketId] = {
            ...newBucketUIState[bucketId],
            bucketId,
            lastUsedUnitId: unitId,
          }
        }

        set({
          photoAssignment: newPhotoAssignment,
          sessionAssignments: newSessionAssignments,
          bucketUIState: newBucketUIState,
        })
      },

      getSessionDisplayState: (sessionId) => {
        const state = get()
        for (const bucket of state.buckets) {
          const session = bucket.sessions.find((s) => s.sessionId === sessionId)
          if (session) {
            return getSessionDisplayState(session, state.photoAssignment)
          }
        }
        return 'unassigned'
      },

      // Photo assignment
      assignPhotos: (photoIds, unitId) =>
        set((state) => {
          const newAssignment = { ...state.photoAssignment }
          for (const pid of photoIds) {
            newAssignment[pid] = unitId
          }
          return { photoAssignment: newAssignment }
        }),

      // Bucket UI state
      setBucketUIState: (bucketId, updates) =>
        set((state) => ({
          bucketUIState: {
            ...state.bucketUIState,
            [bucketId]: {
              ...state.bucketUIState[bucketId],
              bucketId,
              ...updates,
            },
          },
        })),

      getStickyDestination: (bucketId) => {
        const state = get()
        return state.bucketUIState[bucketId]?.lastFixDestination
      },

      // Auto-pick minority
      getMinoritySelection: (sessionId) => {
        const state = get()

        for (const bucket of state.buckets) {
          const session = bucket.sessions.find((s) => s.sessionId === sessionId)
          if (session) {
            const result = computeMajorityAndMinority(
              session.photoIds,
              state.photoAssignment
            )
            return {
              autoPick: result.autoPick,
              selected: result.selected,
              majorityUnit: result.majorityUnit,
              majorityRatio: result.majorityRatio,
            }
          }
        }

        return {
          autoPick: false,
          selected: [],
          majorityUnit: null,
          majorityRatio: 0,
        }
      },

      // Move selected photos
      moveSelectedToUnit: (photoIds, unitId, bucketId) => {
        const state = get()

        // Update assignments
        const newAssignment = { ...state.photoAssignment }
        for (const pid of photoIds) {
          newAssignment[pid] = unitId
        }

        // Update sticky destination
        const newBucketUIState = { ...state.bucketUIState }
        newBucketUIState[bucketId] = {
          ...newBucketUIState[bucketId],
          bucketId,
          lastFixDestination: unitId,
          lastUsedUnitId: unitId,
        }

        set({
          photoAssignment: newAssignment,
          bucketUIState: newBucketUIState,
        })
      },

      // Split session
      splitToNewSession: (bucketId, sourceSessionId, photoIds) => {
        const state = get()
        const newSessionId = `ses_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`

        const newBuckets = state.buckets.map((bucket) => {
          if (bucket.bucketId !== bucketId) return bucket

          const newSessions = bucket.sessions.flatMap((session) => {
            if (session.sessionId !== sourceSessionId) return [session]

            // Remove selected photos from source
            const remainingPhotoIds = session.photoIds.filter(
              (pid) => !photoIds.includes(pid)
            )

            // Create new session with selected photos
            const newSession: RescueSessionSegment = {
              sessionId: newSessionId,
              photoIds,
              dateRange: session.dateRange, // TODO: recalculate
              count: photoIds.length,
              assignment: { status: 'unassigned' },
            }

            if (remainingPhotoIds.length === 0) {
              // Source session is now empty, replace with new
              return [newSession]
            }

            // Return both sessions
            return [
              { ...session, photoIds: remainingPhotoIds, count: remainingPhotoIds.length },
              newSession,
            ]
          })

          return { ...bucket, sessions: newSessions }
        })

        set({ buckets: newBuckets })
        return newSessionId
      },

      // Plan generation
      generatePlan: () => {
        const state = get()
        const actions: RescuePlan['actions'] = []
        let projectsToCreate = 0
        let photosToOrganize = 0
        let photosUnassigned = 0

        for (const group of state.groups) {
          const namingState = state.groupNamingState[group.groupId]
          const name = state.groupNames[group.groupId]

          if (namingState === NamingState.USER_CONFIRMED && name) {
            actions.push({
              type: 'create_project',
              groupId: group.groupId,
              projectName: name,
              photoIds: group.photoIds,
            })
            projectsToCreate++
            photosToOrganize += group.photoIds.length
          } else {
            actions.push({
              type: 'keep_unassigned',
              photoIds: group.photoIds,
            })
            photosUnassigned += group.photoIds.length
          }
        }

        return {
          sessionId: state.session?.sessionId || '',
          actions,
          summary: {
            projectsToCreate,
            photosToOrganize,
            photosUnassigned,
          },
        }
      },

      // Apply
      applyPlan: async () => {
        const state = get()
        set({ isApplying: true })

        try {
          const plan = state.generatePlan()

          // TODO: Send plan to server to create actual projects
          // For Phase 1, we just log the plan
          console.log('[rescue] Applying plan:', plan)

          // Simulate API call
          await new Promise((resolve) => setTimeout(resolve, 1000))

          set({ step: 'applied', isApplying: false })
        } catch (error) {
          console.error('[rescue] Apply error:', error)
          set({
            error: 'Failed to apply rescue plan',
            isApplying: false,
          })
        }
      },

      setIsApplying: (value) => set({ isApplying: value }),

      // Error
      setError: (error) => set({ error }),
    }),
    {
      name: 'jss-rescue-store',
      partialize: (state) => ({
        // Only persist essential state
        session: state.session,
        scanId: state.scanId,
        stateless: state.stateless,
        photos: state.photos,
        groups: state.groups,
        buckets: state.buckets,
        groupNamingState: state.groupNamingState,
        groupNames: state.groupNames,
        photoAssignment: state.photoAssignment,
        sessionAssignments: state.sessionAssignments,
        bucketUIState: state.bucketUIState,
        step: state.step,
      }),
    }
  )
)
