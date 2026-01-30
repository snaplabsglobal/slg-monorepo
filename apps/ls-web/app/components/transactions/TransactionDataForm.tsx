'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { StatusBadge } from './StatusBadge'
import { DeletedInfoBanner } from './DeletedInfoBanner'
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
  onConfirm: () => Promise<void>
  saving?: boolean
  /** Recycle bin: all fields read-only, no Edit/Confirm */
  readOnly?: boolean
  /** Mobile sheet: compact layout, no internal Confirm block; parent provides single Confirm */
  compactForMobile?: boolean
}

export interface TransactionDataFormHandle {
  /** Save current edits if editing and dirty; returns true if a save was performed */
  saveIfDirty: () => Promise<boolean>
}

function TransactionDataFormInner(
  { transaction, onSave, onConfirm, saving, readOnly = false, compactForMobile = false }: TransactionDataFormProps,
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

  const tax = useMemo(() => {
    const td = transaction.tax_details || {}
    const gst = typeof td.gst_amount === 'number' ? td.gst_amount : (Number(td.gst_cents || 0) / 100)
    const pst = typeof td.pst_amount === 'number' ? td.pst_amount : (Number(td.pst_cents || 0) / 100)
    const rawTotal = Number(transaction.total_amount ?? 0)
    const isNeg = isRefund && rawTotal > 0
    return {
      gst,
      pst,
      /** For display: refund with positive stored amount → show negative */
      displayTotal: isNeg ? -Math.abs(rawTotal) : rawTotal,
    }
  }, [transaction.tax_details, transaction.total_amount, isRefund])

  const confidence = useMemo(() => {
    const c = transaction.ai_confidence
    if (typeof c === 'number') return c
    const rd = transaction.raw_data || {}
    const overall = rd?.confidence?.overall
    return typeof overall === 'number' ? overall : null
  }, [transaction.ai_confidence, transaction.raw_data])

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

  const EditIcon = () => (
    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  )

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
          <StatusBadge transaction={transaction as any} />
        </div>
        {!compactForMobile && !readOnly && !editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
          >
            Edit
          </button>
        ) : !compactForMobile && !readOnly && editing ? (
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

      {/* Mobile compact: core data (vendor, date, total) + small Edit icon — COO layout */}
      {compactForMobile && !readOnly && (
        <div className="mb-4 p-4 rounded-xl bg-gray-50 border border-gray-200">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-medium text-gray-500">供应商 · 日期 · 金额</span>
            {!editing ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600"
                aria-label="Edit"
              >
                <EditIcon />
              </button>
            ) : (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setVendorName(transaction.vendor_name || '')
                    setDate(formatDateForInput(transaction.transaction_date))
                    setTotalAmount(String(transaction.total_amount ?? 0))
                    setCategoryUser(transaction.category_user || '')
                  }}
                  className="px-2 py-1 rounded text-xs border border-gray-200 hover:bg-gray-100"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={performSave}
                  disabled={!!saving}
                  className="px-2 py-1 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  保存
                </button>
              </div>
            )}
          </div>
          {!editing ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-gray-900">{transaction.vendor_name || '—'}</p>
              <p className="text-gray-600">{formatDate(transaction.transaction_date)}</p>
              <p className={`font-semibold ${tax.displayTotal < 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
                {tax.displayTotal < 0 ? '−' : ''}${Math.abs(tax.displayTotal).toFixed(2)} {transaction.currency || 'CAD'}
              </p>
            </div>
          ) : null}
        </div>
      )}

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

      <div className={`space-y-4 flex-1 overflow-auto pr-1 ${compactForMobile && !editing ? 'hidden' : ''}`}>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs font-medium text-gray-600">Vendor</label>
          <input
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            disabled={readOnly || !editing || !!saving}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-600"
            placeholder="Vendor name"
          />
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs font-medium text-gray-600">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={readOnly || !editing || !!saving}
            className={`px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:text-gray-600 ${
              suspiciousDate
                ? 'border-amber-400 bg-amber-50 focus:ring-amber-200'
                : 'border-gray-200 focus:ring-blue-100'
            }`}
          />
          {suspiciousDate && (
            <p className="text-xs text-amber-700">
              ⚠️ 年份可疑（距今 {yearsFromNow(date)} 年），请确认
            </p>
          )}
          {typeof confidence === 'number' && (
            <p className="text-xs text-gray-500">AI 置信度: {Math.round(confidence * 100)}%</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-700 mb-2">Canada tax breakdown</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">GST (5%)</span>
            <span className={isRefund && tax.gst > 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-green-700'}>
              {isRefund && tax.gst > 0 ? '−' : ''}${Math.abs(tax.gst).toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-gray-600">PST (7%)</span>
            <span className={isRefund && tax.pst > 0 ? 'font-semibold text-emerald-700' : 'font-semibold text-gray-700'}>
              {isRefund && tax.pst > 0 ? '−' : ''}${Math.abs(tax.pst).toFixed(2)}
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
                <span className={`text-lg font-bold ${tax.displayTotal < 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
                  {tax.displayTotal < 0 ? '−' : ''}${Math.abs(tax.displayTotal).toFixed(2)} {transaction.currency || 'CAD'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="text-xs font-medium text-gray-600">Category</label>
          <input
            value={categoryUser}
            onChange={(e) => setCategoryUser(e.target.value)}
            disabled={readOnly || !editing || !!saving}
            className="px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:text-gray-600"
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

      {!readOnly && !compactForMobile && (
        <div className="pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onConfirm}
            disabled={!!saving || transaction.status === 'exported' || transaction.status === 'locked' || !!transaction.deleted_at}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-60"
          >
            ✓ Confirm & move on
          </button>
          <p className="text-xs text-gray-500 mt-2">
            Confirm will set status to approved and close this panel.
          </p>
        </div>
      )}
    </div>
  )
}

export const TransactionDataForm = forwardRef(TransactionDataFormInner)
