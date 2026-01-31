'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { StatusBadge } from './StatusBadge'
import { StatusBadgeSkeleton } from '@/app/components/ui/LoadingSkeleton'
import { DeletedInfoBanner } from './DeletedInfoBanner'
import { getTransactionTaxAndConfidence } from '@slo/shared-utils'
import {
  isSuspiciousDate,
  yearsFromNow,
  recordCorrection,
} from '@/app/lib/ml-correction'
import { formatDateForInput, formatDate } from '@/app/lib/utils/date'

export interface TransactionDetail {
  id: string
  vendor_name: string | null
  transaction_date: string
  total_amount: number
  currency: string
  status: string
  is_verified?: boolean | null
  needs_review?: boolean | null
  deleted_at?: string | null
  deletion_reason?: string | null
  category_user?: string | null
  attachment_url?: string | null
  ai_confidence?: number | null
  raw_data?: any
  tax_details?: any
  exported_at?: string | null
  voided_at?: string | null
  void_reason?: string | null
}

interface TransactionDataFormProps {
  transaction: TransactionDetail
  onSave: (updates: Partial<TransactionDetail>) => Promise<void>
  /** Legacy; confirm flow is now single ConfirmDataButton in parent (確認數據) */
  onConfirm?: () => Promise<void>
  saving?: boolean
  /** Recycle bin: all fields read-only, no Edit/Confirm */
  readOnly?: boolean
  /** Mobile sheet: compact layout, no internal Confirm block; parent provides single Confirm */
  compactForMobile?: boolean
  /** Mobile: when user taps Edit, parent can expand sheet to full height */
  onStartEdit?: () => void
  /** When true, show a skeleton instead of StatusBadge (data still loading); avoids status flicker */
  showStatusSkeleton?: boolean
}

export interface TransactionDataFormHandle {
  /** Save current edits if editing and dirty; returns true if a save was performed */
  saveIfDirty: () => Promise<boolean>
}

function TransactionDataFormInner(
  { transaction, onSave, onConfirm, saving, readOnly = false, compactForMobile = false, onStartEdit, showStatusSkeleton = false }: TransactionDataFormProps,
  ref: React.Ref<TransactionDataFormHandle>
) {
  const [editing, setEditing] = useState(false)
  const [vendorName, setVendorName] = useState(transaction.vendor_name || '')
  const [date, setDate] = useState(() => formatDateForInput(transaction.transaction_date))
  const [totalAmount, setTotalAmount] = useState(String(transaction.total_amount ?? 0))
  const [categoryUser, setCategoryUser] = useState(transaction.category_user || '')
  const [mlRecorded, setMlRecorded] = useState(false)
  const [patternDialogOpen, setPatternDialogOpen] = useState(false)
  const [patternVendor, setPatternVendor] = useState<string | null>(null)
  const [patternIsDefaultRule, setPatternIsDefaultRule] = useState(false)

  // Sync date when transaction changes (e.g. open another transaction); use formatDateForInput to avoid timezone -1 day
  useEffect(() => {
    setDate(formatDateForInput(transaction.transaction_date))
  }, [transaction.id, transaction.transaction_date])

  const isRefund = Boolean(transaction?.raw_data?.is_refund)
  const suspiciousDate = useMemo(() => isSuspiciousDate(date), [date])

  const { gst, pst, total, confidence, needs_review } = useMemo(
    () => getTransactionTaxAndConfidence(transaction),
    [transaction]
  )
  const displayTotal = isRefund && total > 0 ? -Math.abs(total) : total
  const displayGst = gst ?? null
  const displayPst = pst ?? null

  const isDirty =
    String(transaction.vendor_name || '') !== String(vendorName || '') ||
    String(transaction.transaction_date || '') !== String(date || '') ||
    String(transaction.total_amount ?? '') !== String(totalAmount) ||
    String(transaction.category_user || '') !== String(categoryUser || '')

  const editingRef = useRef(editing)
  const isDirtyRef = useRef(isDirty)
  editingRef.current = editing
  isDirtyRef.current = isDirty

  const performSave = async () => {
    const updates = {
      vendor_name: vendorName || null,
      transaction_date: date,
      total_amount: Number(totalAmount),
      category_user: categoryUser || null,
    }
    await onSave(updates)
    setEditing(false)

    const correctionFields: string[] = []
    if (String(transaction.vendor_name || '') !== String(vendorName || '')) correctionFields.push('vendor_name')
    if (String(transaction.transaction_date || '') !== String(date || '')) correctionFields.push('transaction_date')
    if (String(transaction.total_amount ?? '') !== String(totalAmount)) correctionFields.push('total_amount')
    if (String(transaction.category_user || '') !== String(categoryUser || '')) correctionFields.push('category_user')

    if (correctionFields.length > 0) {
      const locationContext =
        typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null
      const result = await recordCorrection({
        transactionId: transaction.id,
        originalExtraction: {
          vendor_name: transaction.vendor_name,
          transaction_date: transaction.transaction_date,
          total_amount: transaction.total_amount,
          category_user: transaction.category_user,
          ...(transaction.raw_data || {}),
        },
        correctedData: {
          vendor_name: vendorName || null,
          transaction_date: date,
          total_amount: Number(totalAmount),
          category_user: categoryUser || null,
        },
        correctionFields,
        locationContext,
      })
      if (result.success) {
        setMlRecorded(true)
        setTimeout(() => setMlRecorded(false), 2500)
      }
      if (result.vendorPattern && result.vendorPattern.correctionCount >= 3 && transaction.vendor_name) {
        setPatternVendor(transaction.vendor_name)
        setPatternIsDefaultRule(result.vendorPattern.isDefaultRule)
        setPatternDialogOpen(true)
      }
    }
  }

  const performSaveRef = useRef(performSave)
  performSaveRef.current = performSave

  useImperativeHandle(ref, () => ({
    saveIfDirty: async (): Promise<boolean> => {
      if (!editingRef.current || !isDirtyRef.current) return false
      await performSaveRef.current()
      return true
    },
  }), [])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">AI extracted data</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {isRefund ? 'Refund detected (original amount was negative)' : 'Purchase'}
            {readOnly && <span className="ml-1 text-gray-400">(只读)</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showStatusSkeleton || !transaction ? (
            <StatusBadgeSkeleton />
          ) : (
            <StatusBadge transaction={transaction as any} />
          )}
        </div>
        {!readOnly && !editing ? (
          <button
            type="button"
            onClick={() => {
              onStartEdit?.()
              setEditing(true)
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
          >
            Edit
          </button>
        ) : !readOnly && editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setVendorName(transaction.vendor_name || '')
                setDate(formatDateForInput(transaction.transaction_date))
                setTotalAmount(String(transaction.total_amount ?? 0))
                setCategoryUser(transaction.category_user || '')
              }}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
              disabled={!!saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={performSave}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
              disabled={!!saving}
            >
              Save
            </button>
          </div>
        ) : null}
      </div>

      {/* Recycle bin: full deleted info banner */}
      {readOnly && transaction.deleted_at && (
        <DeletedInfoBanner
          deletedAt={transaction.deleted_at}
          deletionReason={transaction.deletion_reason}
        />
      )}
      {/* Non–read-only: simple soft delete banner */}
      {!readOnly && transaction.deleted_at && (
        <div className="mb-4 p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-900">
          <p className="text-sm font-semibold">🗑️ 已移入回收站</p>
          <p className="text-xs text-blue-800 mt-1">
            删除时间：{new Date(transaction.deleted_at).toLocaleString()}
          </p>
        </div>
      )}

      {/* Layer 3: export lock banner */}
      {(transaction.status === 'exported' || transaction.status === 'locked') && (
        <div className="mb-4 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
          <p className="text-sm font-semibold">🔒 已导出/锁定</p>
          <p className="text-xs text-amber-800 mt-1">
            已导出的记录不能直接删除/替换。如需更正，请使用“作废”。
          </p>
        </div>
      )}

      {/* Full form: 卡片化設計，財稅綠 #10b981 高亮 Total/Tax */}
      <div className="space-y-4 flex-1 overflow-auto pr-1">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="text-xs font-medium text-gray-600">Vendor</label>
          <input
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            disabled={readOnly || !editing || !!saving}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-600"
            placeholder="Vendor name"
          />
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="text-xs font-medium text-gray-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={readOnly || !editing || !!saving}
            className={`mt-1 w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:text-gray-600 ${
              suspiciousDate
                ? 'border-amber-400 bg-amber-50 focus:ring-amber-200'
                : 'border-gray-200 focus:ring-blue-100'
            }`}
          />
          {suspiciousDate && (
            <p className="mt-1 text-xs text-amber-700">
              ⚠️ 年份可疑（距今 {yearsFromNow(date)} 年），请确认
            </p>
          )}
          {typeof confidence === 'number' && (
            <p className="mt-1 text-xs text-gray-500">AI 置信度: {Math.round(confidence * 100)}%</p>
          )}
        </div>

        <div className={`rounded-xl border bg-white p-4 shadow-sm ${needs_review ? 'border-amber-300 bg-amber-50/50' : 'border-gray-100'}`}>
          <p className="text-xs font-semibold text-gray-700 mb-2">Canada tax breakdown</p>
          {needs_review && (
            <p className="text-xs text-amber-700 mb-2">需要確認：稅金未識別或為空，請核對</p>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">GST (5%)</span>
            <span className="font-semibold" style={displayGst != null ? { color: '#10b981' } : undefined}>
              {displayGst != null
                ? `${isRefund && displayGst > 0 ? '−' : ''}$${Math.abs(displayGst).toFixed(2)}`
                : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">PST (7%)</span>
            <span className="font-semibold" style={displayPst != null ? { color: '#10b981' } : undefined}>
              {displayPst != null
                ? `${isRefund && displayPst > 0 ? '−' : ''}$${Math.abs(displayPst).toFixed(2)}`
                : '—'}
            </span>
          </div>
          <div className="border-t border-gray-100 my-3" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Total</span>
            <div className="flex items-center gap-2">
              {!readOnly && editing ? (
                <input
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  disabled={!!saving}
                  className="w-28 text-right px-2 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              ) : (
                <span className="text-lg font-bold" style={{ color: displayTotal < 0 ? '#059669' : '#10b981' }}>
                  {displayTotal < 0 ? '−' : ''}${Math.abs(displayTotal).toFixed(2)} {transaction.currency || 'CAD'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="text-xs font-medium text-gray-600">Category</label>
          <input
            value={categoryUser}
            onChange={(e) => setCategoryUser(e.target.value)}
            disabled={readOnly || !editing || !!saving}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-600"
            placeholder="Category (user)"
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs font-medium text-gray-600">GIFI</label>
          <input
            value={transaction?.raw_data?.accounting?.gifi_code || ''}
            disabled
            className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-700"
            placeholder="GIFI code"
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">AI confidence</span>
          <span className="font-semibold text-gray-900">
            {typeof confidence === 'number' ? `${Math.round(confidence * 100)}%` : '—'}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Status</span>
          <span className="font-semibold text-gray-900">{transaction.status}</span>
        </div>
      </div>

      {patternDialogOpen && patternVendor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">🧠 检测到模式</h3>
            <p className="text-sm text-gray-700">
              系统检测到您多次修正 <strong>{patternVendor}</strong> 的日期格式。
            </p>
            <p className="text-sm text-gray-600">
              已记录到数据库，本组织内后续识别此商家会更准确。
            </p>
            {patternIsDefaultRule && (
              <p className="text-sm font-medium text-emerald-700">
                ✓ 已升级为默认规则（10 次修正），一人纠错，全员受益。
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setPatternDialogOpen(false)
                setPatternVendor(null)
                setPatternIsDefaultRule(false)
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              知道了
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export const TransactionDataForm = forwardRef(TransactionDataFormInner)
