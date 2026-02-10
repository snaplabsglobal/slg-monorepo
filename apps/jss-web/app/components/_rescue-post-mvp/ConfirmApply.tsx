'use client'

/**
 * Confirm Apply (Step 5) - 最后一道闸
 *
 * "You're about to organize your photos"
 *
 * Must show:
 * - Exactly what will change
 * - "Nothing changes until you click Confirm"
 */

import { useRescueStore, NamingState } from '@/lib/rescue'

interface ConfirmApplyProps {
  onConfirm: () => void
  onBack: () => void
  lang?: 'en' | 'zh'
}

const copy = {
  en: {
    title: "You're about to organize your photos",
    summary: {
      projects: 'groups will be named as projects',
      photos: 'photos will be organized',
      deletions: 'photos will be deleted',
      unassigned: 'photos kept unassigned',
    },
    bottomNote: 'Nothing changes until you click Confirm.',
    buttons: {
      confirm: 'Confirm & apply',
      back: 'Go back',
    },
  },
  zh: {
    title: '你即将整理这些照片',
    summary: {
      projects: '个分组将被命名为项目',
      photos: '张照片将被整理',
      deletions: '张照片将被删除',
      unassigned: '张照片保持未分配',
    },
    bottomNote: '你不点确认，什么都不会改。',
    buttons: {
      confirm: '确认并应用',
      back: '返回',
    },
  },
}

export function ConfirmApply({ onConfirm, onBack, lang = 'en' }: ConfirmApplyProps) {
  const t = copy[lang]
  const { groups, groupNamingState, groupNames, isApplying, applyPlan } = useRescueStore()

  // Calculate summary
  const namedProjects = groups.filter(
    (g) => groupNamingState[g.groupId] === NamingState.USER_CONFIRMED && groupNames[g.groupId]
  )
  const unassignedGroups = groups.filter(
    (g) => groupNamingState[g.groupId] !== NamingState.USER_CONFIRMED
  )

  const projectCount = namedProjects.length
  const organizedPhotoCount = namedProjects.reduce((sum, g) => sum + g.photoIds.length, 0)
  const unassignedPhotoCount = unassignedGroups.reduce((sum, g) => sum + g.photoIds.length, 0)

  const handleConfirm = async () => {
    await applyPlan()
    onConfirm()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-amber-500/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
        </div>

        {/* Summary Cards */}
        <div className="space-y-3 mb-8">
          {/* Projects to create */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-slate-300">{t.summary.projects}</span>
            </div>
            <span className="text-2xl font-bold text-white">{projectCount}</span>
          </div>

          {/* Photos to organize */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-slate-300">{t.summary.photos}</span>
            </div>
            <span className="text-2xl font-bold text-white">{organizedPhotoCount}</span>
          </div>

          {/* Photos unassigned */}
          {unassignedPhotoCount > 0 && (
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-slate-400">{t.summary.unassigned}</span>
              </div>
              <span className="text-xl font-bold text-slate-400">{unassignedPhotoCount}</span>
            </div>
          )}

          {/* No deletions */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <span className="text-slate-400">{t.summary.deletions}</span>
            </div>
            <span className="text-xl font-bold text-green-400">0</span>
          </div>
        </div>

        {/* Named Projects Preview */}
        {namedProjects.length > 0 && (
          <div className="mb-8">
            <div className="text-slate-400 text-sm mb-3">Projects to create:</div>
            <div className="space-y-2">
              {namedProjects.map((group) => (
                <div
                  key={group.groupId}
                  className="bg-slate-800/30 rounded-lg px-4 py-2 flex items-center justify-between"
                >
                  <span className="text-white">{groupNames[group.groupId]}</span>
                  <span className="text-slate-500 text-sm">{group.photoIds.length} photos</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Note */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-amber-500/30 mb-6">
          <p className="text-amber-400 text-sm text-center">{t.bottomNote}</p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleConfirm}
            disabled={isApplying || projectCount === 0}
            className={`w-full py-4 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 ${
              isApplying || projectCount === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-600 text-slate-900'
            }`}
          >
            {isApplying ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              t.buttons.confirm
            )}
          </button>

          <button
            onClick={onBack}
            disabled={isApplying}
            className="w-full py-3 text-slate-400 hover:text-slate-300 border border-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            {t.buttons.back}
          </button>
        </div>
      </div>
    </div>
  )
}
