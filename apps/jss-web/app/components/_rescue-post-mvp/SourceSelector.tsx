'use client'

/**
 * Source Selector (Step 1)
 *
 * "Where are your photos coming from?"
 *
 * Trust point: "JSS never logs into other apps or systems."
 */

import { useState } from 'react'
import type { RescueSource } from '@/lib/rescue/types'

interface SourceSelectorProps {
  onSelect: (source: RescueSource) => void
  onBack: () => void
  lang?: 'en' | 'zh'
}

const copy = {
  en: {
    title: 'Where are your photos coming from?',
    subtitle: 'We don\'t connect to other apps. You choose what to bring in.',
    sources: {
      phone_camera_roll: {
        label: 'Phone / Camera Roll',
        description: 'Select photos from your device',
      },
      local_folder: {
        label: 'Local folder (zip / drag & drop)',
        description: 'Upload a folder or zip file',
      },
      external_drive: {
        label: 'External drive',
        description: 'Connect a USB drive or SD card',
      },
      exported_project: {
        label: 'Exported project folders',
        description: 'From another photo management app',
      },
    },
    trust: 'JSS never logs into other apps or systems.',
    buttons: {
      next: 'Continue',
      back: 'Back',
    },
  },
  zh: {
    title: '照片从哪里来？',
    subtitle: '我们不会连接其他应用。由你选择导入什么。',
    sources: {
      phone_camera_roll: {
        label: '手机 / 相册',
        description: '从你的设备选择照片',
      },
      local_folder: {
        label: '本地文件夹（zip / 拖放）',
        description: '上传文件夹或压缩包',
      },
      external_drive: {
        label: '外置硬盘',
        description: '连接U盘或SD卡',
      },
      exported_project: {
        label: '导出的项目文件夹',
        description: '来自其他照片管理应用',
      },
    },
    trust: 'JSS 永远不会登录其他应用或系统。',
    buttons: {
      next: '继续',
      back: '返回',
    },
  },
}

const sourceIcons: Record<RescueSource, React.ReactNode> = {
  phone_camera_roll: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  local_folder: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  external_drive: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  exported_project: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
}

export function SourceSelector({ onSelect, onBack, lang = 'en' }: SourceSelectorProps) {
  const t = copy[lang]
  const [selected, setSelected] = useState<RescueSource | null>(null)

  const sources: RescueSource[] = [
    'phone_camera_roll',
    'local_folder',
    'external_drive',
    'exported_project',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">{t.title}</h1>
          <p className="text-slate-400">{t.subtitle}</p>
        </div>

        {/* Source Options */}
        <div className="space-y-3 mb-8">
          {sources.map((source) => (
            <button
              key={source}
              onClick={() => setSelected(source)}
              className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 ${
                selected === source
                  ? 'bg-amber-500/10 border-amber-500 text-white'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  selected === source ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {sourceIcons[source]}
              </div>
              <div>
                <div className="font-medium">{t.sources[source].label}</div>
                <div className="text-sm text-slate-500">
                  {t.sources[source].description}
                </div>
              </div>
              {selected === source && (
                <div className="ml-auto">
                  <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 text-slate-400 hover:text-slate-300 border border-slate-700 rounded-xl transition-colors"
          >
            {t.buttons.back}
          </button>
          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className={`flex-1 py-3 font-semibold rounded-xl transition-colors ${
              selected
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-900'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {t.buttons.next}
          </button>
        </div>

        {/* Trust Badge */}
        <p className="text-center text-slate-500 text-xs mt-8">
          {t.trust}
        </p>
      </div>
    </div>
  )
}
