// components/transactions/TransactionCard.tsx
'use client'

import { useState, useEffect } from 'react'
// Using SVG icons instead of lucide-react
const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)
const ChevronUpIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
)
const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)
import { TagSelector, TagList, type Tag } from '@/app/components/tags'
import { CategorySelector } from '@/app/components/categories/CategorySelector'
import type { Transaction } from './TransactionList'
import { StatusBadge } from './StatusBadge'
import { getReceiptStatus, getReceiptStatusUI } from '@slo/shared-utils'
import { toReceiptLike } from '@/app/lib/receipts/mapReceiptLike'
import { PermanentDeleteDialog } from './PermanentDeleteDialog'
import { formatDateOnly } from '@/app/lib/utils/format'

export interface TransactionCardProps {
  transaction: Transaction
  organizationId: string
  isExpanded: boolean
  onToggleExpand: () => void
  onOpenDetail?: (id: string) => void
  showRestoreButton?: boolean // Show restore button in recycle bin
}

export function TransactionCard({
  transaction,
  organizationId,
  isExpanded,
  onToggleExpand,
  onOpenDetail,
  showRestoreButton = false,
}: TransactionCardProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [aiSuggestions, setAiSuggestions] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [category, setCategory] = useState<any>(null)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [permanentDeleteOpen, setPermanentDeleteOpen] = useState(false)

  // Fetch transaction tags (with retry on transient network errors)
  useEffect(() => {
    let cancelled = false
    async function fetchTags(retryCount = 0) {
      try {
        const response = await fetch(`/api/tags/${transaction.id}`)
        if (cancelled) return
        const data = await response.json()
        if (data.tags) {
          const tagIds = data.tags.map((tt: any) => tt.tag_id)
          setSelectedTagIds(tagIds)
          setTags(data.tags.map((tt: any) => tt.tag).filter(Boolean))
        }
      } catch (error) {
        if (cancelled) return
        const isNetworkError =
          error instanceof TypeError && (error.message === 'Failed to fetch' || (error as Error).name === 'TypeError')
        if (isNetworkError && retryCount < 1) {
          // ERR_NETWORK_CHANGED / WiFi switch / HMR: retry once after 2s
          setTimeout(() => fetchTags(retryCount + 1), 2000)
          return
        }
        if (!isNetworkError) {
          console.error('Error fetching transaction tags:', error)
        }
        // Network errors after retry: silent fail (tags will refetch on next mount/navigation)
      }
    }

    fetchTags()
    return () => {
      cancelled = true
    }
  }, [transaction.id])

  // Fetch transaction category (with retry on transient network errors)
  useEffect(() => {
    if (!isExpanded) return
    let cancelled = false
    async function fetchCategory(retryCount = 0) {
      try {
        const response = await fetch(`/api/transactions/${transaction.id}/category`)
        if (cancelled) return
        const data = await response.json()
        if (data.category) setCategory(data.category)
      } catch (error) {
        if (cancelled) return
        const isNetworkError =
          error instanceof TypeError && (error.message === 'Failed to fetch' || (error as Error).name === 'TypeError')
        if (isNetworkError && retryCount < 1) {
          setTimeout(() => fetchCategory(retryCount + 1), 2000)
          return
        }
        if (!isNetworkError) console.error('Error fetching transaction category:', error)
      }
    }

    fetchCategory()
    return () => {
      cancelled = true
    }
  }, [transaction.id, isExpanded])

  // Fetch AI suggestions when expanded
  useEffect(() => {
    if (isExpanded && transaction.vendor_name && transaction.total_amount) {
      setLoadingSuggestions(true)
      fetch('/api/tags/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName: transaction.vendor_name,
          amount: transaction.total_amount,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.suggestions) {
            setAiSuggestions(data.suggestions)
          }
        })
        .catch((error) => {
          console.error('Error fetching AI suggestions:', error)
        })
        .finally(() => {
          setLoadingSuggestions(false)
        })
    }
  }, [isExpanded, transaction.vendor_name, transaction.total_amount])

  const handleTagsChange = async (newTagIds: string[]) => {
    setLoading(true)
    try {
      // Find added and removed tags
      const added = newTagIds.filter((id) => !selectedTagIds.includes(id))
      const removed = selectedTagIds.filter((id) => !newTagIds.includes(id))

      // Add new tags
      for (const tagId of added) {
        await fetch(`/api/tags/${transaction.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tagId,
            source: 'user_manual',
            userConfirmed: true,
          }),
        })
      }

      // Remove tags
      for (const tagId of removed) {
        await fetch(`/api/tags/${transaction.id}?tagId=${tagId}`, {
          method: 'DELETE',
        })
      }

      setSelectedTagIds(newTagIds)
      
      // Refresh tags
      const response = await fetch(`/api/tags/${transaction.id}`)
      const data = await response.json()
      if (data.tags) {
        setTags(data.tags.map((tt: any) => tt.tag).filter(Boolean))
      }
    } catch (error) {
      console.error('Error updating tags:', error)
      alert('Failed to update tags. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApplySuggestion = async (tagId: string) => {
    if (!selectedTagIds.includes(tagId)) {
      await handleTagsChange([...selectedTagIds, tagId])
    }
  }

  const handleCategoryChange = async (categoryId: string) => {
    setCategoryLoading(true)
    try {
      const response = await fetch(`/api/transactions/${transaction.id}/category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId }),
      })
      if (response.ok) {
        // Refresh category
        const data = await response.json()
        if (data.category) {
          setCategory(data.category)
        } else {
          // Fetch updated category
          const fetchResponse = await fetch(`/api/transactions/${transaction.id}/category`)
          const fetchData = await fetchResponse.json()
          if (fetchData.category) {
            setCategory(fetchData.category)
          }
        }
      }
    } catch (error) {
      console.error('Error updating category:', error)
      alert('Failed to update category. Please try again.')
    } finally {
      setCategoryLoading(false)
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: currency || 'CAD',
    }).format(amount)
  }

  const receiptLike = toReceiptLike(transaction as any)
  const receiptStatus = getReceiptStatus(receiptLike)
  const statusUi = getReceiptStatusUI(receiptStatus)

  // Don't render deleted transactions in main list (eye-out-of-sight)
  // Only show them in recycle bin (when showRestoreButton is true)
  if (!showRestoreButton && (transaction as any).deleted_at) {
    return null
  }

  return (
    <div
      className="bg-white rounded-lg shadow-sm border-2 overflow-hidden transition-all hover:shadow-md"
      style={{ borderColor: `${statusUi.color}60` }}
    >
      {/* Transaction Summary */}
      <div
        className="p-4 cursor-pointer transition-colors"
        style={{ backgroundColor: `${statusUi.color}15` }}
        onClick={() => onOpenDetail?.(transaction.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">
                {transaction.vendor_name || 'Unknown Vendor'}
              </h3>
              <StatusBadge transaction={transaction as any} />
              {/* Refund badge – distinct so users don't confuse with regular spending */}
              {((): boolean => {
                const raw = (transaction as any).raw_data
                return Boolean(raw?.is_refund) || (transaction.direction === 'expense' && (transaction.total_amount ?? 0) < 0)
              })() && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Refund
                </span>
              )}
              {/* Amount: income = green +; refund = green −; expense = red */}
              {(() => {
                const isRefund = Boolean((transaction as any).raw_data?.is_refund) || (transaction.direction === 'expense' && (transaction.total_amount ?? 0) < 0)
                const isIncome = transaction.direction === 'income'
                const amount = Math.abs(transaction.total_amount || 0)
                const colorClass = isIncome ? 'text-green-700' : isRefund ? 'text-emerald-700' : 'text-red-700'
                const sign = isIncome ? '+' : isRefund ? '−' : ''
                return (
                  <span className={`px-2 py-0.5 rounded text-xs font-medium bg-white/70 border border-gray-200 ${colorClass}`}>
                    {sign}{formatAmount(amount, transaction.currency)}
                  </span>
                )
              })()}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{formatDateOnly(transaction.transaction_date)}</span>
              <span className="text-xs text-gray-500">{statusUi.label}</span>
            </div>
            {tags.length > 0 && (
              <div className="mt-2">
                <TagList tags={tags} size="sm" />
              </div>
            )}
          </div>
          <button
            className="ml-4 text-gray-400 hover:text-gray-600"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {/* Restore + Permanent Delete (for Recycle Bin) */}
          {showRestoreButton && (transaction as any).deleted_at && (
            <div className="mb-4 p-3 rounded-lg border border-blue-200 bg-blue-50 space-y-2">
              <p className="text-sm text-blue-900">
                🗑️ 已删除于 {new Date((transaction as any).deleted_at).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/transactions/${transaction.id}/restore`, {
                        method: 'POST',
                      })
                      if (res.ok) {
                        window.location.reload()
                      } else {
                        const error = await res.json().catch(() => ({}))
                        alert(error.error || '恢复失败')
                      }
                    } catch (err) {
                      alert('恢复失败，请重试')
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  ↻ 恢复此记录
                </button>
                <button
                  onClick={() => setPermanentDeleteOpen(true)}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  永久删除
                </button>
              </div>
              <PermanentDeleteDialog
                open={permanentDeleteOpen}
                onClose={() => setPermanentDeleteOpen(false)}
                transactionId={transaction.id}
                vendorName={transaction.vendor_name}
                onDeleted={() => window.location.reload()}
              />
            </div>
          )}
          
          {/* AI Suggestions */}
          {loadingSuggestions ? (
            <div className="mb-4 text-sm text-gray-500">Loading AI suggestions...</div>
          ) : aiSuggestions.length > 0 ? (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon />
                <span className="text-sm font-medium text-gray-700">AI Suggestions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {aiSuggestions.map((suggestion: any) => (
                  <button
                    key={suggestion.tag_id}
                    onClick={() => handleApplySuggestion(suggestion.tag_id)}
                    disabled={selectedTagIds.includes(suggestion.tag_id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedTagIds.includes(suggestion.tag_id)
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    {suggestion.tag_name}
                    {suggestion.confidence && (
                      <span className="ml-1 text-xs opacity-70">
                        ({Math.round(suggestion.confidence * 100)}%)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* Accounting Category */}
          <div className="mb-4">
            <CategorySelector
              transactionId={transaction.id}
              selectedCategoryId={category?.category_id}
              onCategoryChange={handleCategoryChange}
              confidence={category?.confidence_score}
              userConfirmed={category?.user_confirmed || false}
              showAutoAssign={true}
            />
          </div>

          {/* Tag Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🏷️ 标签（业务用）
            </label>
            <TagSelector
              selectedTags={selectedTagIds}
              onTagsChange={handleTagsChange}
              organizationId={organizationId}
              showCreateButton={true}
            />
            {loading && (
              <p className="mt-2 text-xs text-gray-500">Updating tags...</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
