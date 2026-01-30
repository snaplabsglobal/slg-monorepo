'use client'

import { useState } from 'react'

const CONFIRM_TEXT = 'PERMANENTLY DELETE'

const REASONS = [
  { value: '', label: '选择原因 (必选)' },
  { value: 'non_business', label: '非业务照片 / 误传' },
  { value: 'duplicate', label: '重复上传' },
  { value: 'personal', label: '个人消费' },
  { value: 'other', label: '其他' },
] as const

interface PermanentDeleteDialogProps {
  open: boolean
  onClose: () => void
  transactionId: string
  vendorName?: string | null
  onDeleted: () => void
}

export function PermanentDeleteDialog({
  open,
  onClose,
  transactionId,
  vendorName,
  onDeleted,
}: PermanentDeleteDialogProps) {
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit =
    reason &&
    confirmation === CONFIRM_TEXT &&
    !loading

  const handleSubmit = async () => {
    if (!canSubmit) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions/${transactionId}/permanent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, confirmation }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error || `请求失败 (${res.status})`)
        return
      }
      onDeleted()
      onClose()
      setReason('')
      setConfirmation('')
    } catch (e: any) {
      setError(e?.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setReason('')
      setConfirmation('')
      setError(null)
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">永久删除</h2>

        <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold mb-2">⚠️ CRA 税务合规提醒</p>
          <ul className="list-disc list-inside space-y-1">
            <li>加拿大税务局 (CRA) 要求业务记录保留至少 6 年</li>
            <li>永久删除后无法恢复，审计时无法提供该记录</li>
            <li>仅建议对「非业务照片」「误传」「重复」等情形使用</li>
          </ul>
        </div>

        {vendorName && (
          <p className="text-sm text-gray-600">
            将永久删除：<strong>{vendorName}</strong>
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">删除原因 (必选)</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {REASONS.map((r) => (
              <option key={r.value || 'empty'} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            请输入 <code className="bg-gray-100 px-1 rounded">{CONFIRM_TEXT}</code> 以确认
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={CONFIRM_TEXT}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            autoComplete="off"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '删除中…' : '永久删除'}
          </button>
        </div>
      </div>
    </div>
  )
}
