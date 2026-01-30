// components/transactions/TransactionList.tsx
'use client'

import { useMemo, useState, useEffect } from 'react'
import { TransactionCard } from './TransactionCard'
import { TransactionVisualCard } from './TransactionVisualCard'
import { ResponsiveDetailPanel } from './ResponsiveDetailPanel'
import { useRealtimeTransactions } from '@/app/hooks/useRealtimeTransactions'
import { ViewToggle, type ViewMode } from './ViewToggle'
import { FiltersBar, type Filters } from './FiltersBar'
import { deriveAsyncStatus } from './status'

export interface Transaction {
  id: string
  organization_id: string
  transaction_date: string
  vendor_name: string | null
  total_amount: number
  currency: string
  direction: 'income' | 'expense'
  status: string
  created_at: string
  deleted_at?: string | null
}

export interface TransactionListProps {
  transactions?: Transaction[] // Optional: can use Realtime instead
  organizationId: string
  showRestoreButton?: boolean // Show restore button for recycle bin
  /** When set, only show transactions with this direction (e.g. Income page uses "income") */
  directionFilter?: 'income' | 'expense'
}

export function TransactionList({
  transactions: propTransactions,
  organizationId,
  showRestoreButton = false,
  directionFilter,
}: TransactionListProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  
  // View mode: card or list (persist to localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>('card')
  
  // Filters state
  const [filters, setFilters] = useState<Filters>({
    sortBy: 'date',
    sortOrder: 'desc',
  })
  
  useEffect(() => {
    // Load view mode preference from localStorage
    const saved = localStorage.getItem('transactions-view-mode') as ViewMode | null
    if (saved === 'card' || saved === 'list') {
      setViewMode(saved)
    }
  }, [])
  
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem('transactions-view-mode', mode)
  }

  // Use Realtime hook only for main list (not recycle bin)
  // Recycle bin uses server-side props only
  const { transactions: realtimeTransactions, isLoading } = showRestoreButton 
    ? { transactions: [], isLoading: false } // Don't use Realtime for recycle bin
    : useRealtimeTransactions(organizationId)

  // Use realtime data if available, otherwise fallback to props
  let rawTransactions = showRestoreButton 
    ? (propTransactions || []) // Recycle bin: use props only (show deleted items)
    : (realtimeTransactions.length > 0 ? realtimeTransactions : (propTransactions || []))

  // CRITICAL: Filter out deleted items from main list (eye-out-of-sight)
  // Only show deleted items in recycle bin
  let transactions = showRestoreButton
    ? rawTransactions // Recycle bin: show all (deleted items)
    : rawTransactions.filter((t) => !t.deleted_at) // Main list: filter out deleted items

  // Apply direction filter (e.g. Income page shows only direction=income)
  if (directionFilter) {
    transactions = transactions.filter((t) => t.direction === directionFilter)
  }

  // Apply status filter (Receipts: All / Pending Review / Approved / Needs Attention)
  const statusFilter = filters.statusFilter ?? 'all'
  if (statusFilter !== 'all') {
    transactions = transactions.filter((t) => {
      const status = deriveAsyncStatus(t as any)
      if (statusFilter === 'pending') return status === 'pending' || status === 'needs_review'
      if (statusFilter === 'approved') return status === 'approved'
      if (statusFilter === 'needs_attention') return status === 'error' || status === 'warning'
      return true
    })
  }

  const orderedIds = useMemo(() => transactions.map((t) => t.id), [transactions])

  if (isLoading && transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Loading transactions...</p>
      </div>
    )
  }

  if (transactions.length === 0) {
    const emptyMessage = directionFilter === 'income'
      ? 'No income transactions yet'
      : directionFilter === 'expense'
        ? 'No receipts yet'
        : 'No transactions found'
    const emptyHint = directionFilter === 'income'
      ? 'Income from clients will appear here'
      : 'Start by uploading receipts or creating transactions'
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{emptyMessage}</p>
        <p className="text-sm text-gray-400">{emptyHint}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters and View Toggle - Only show in main list (not recycle bin) */}
      {!showRestoreButton && (
        <>
          <FiltersBar filters={filters} onFiltersChange={setFilters} />
          <div className="flex justify-end">
            <ViewToggle mode={viewMode} onChange={handleViewModeChange} />
          </div>
        </>
      )}

      {/* Card View */}
      {viewMode === 'card' && !showRestoreButton ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transactions.map((transaction, index) => (
            <TransactionVisualCard
              key={transaction.id}
              transaction={transaction}
              onClick={() => setDetailId(transaction.id)}
              priority={index === 0}
            />
          ))}
        </div>
      ) : (
        /* List View (original) */
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <TransactionCard
              key={transaction.id}
              transaction={transaction}
              organizationId={organizationId}
              isExpanded={selectedTransaction === transaction.id}
              onToggleExpand={() =>
                setSelectedTransaction(
                  selectedTransaction === transaction.id ? null : transaction.id
                )
              }
              onOpenDetail={(id) => setDetailId(id)}
              showRestoreButton={showRestoreButton}
            />
          ))}
        </div>
      )}

      <ResponsiveDetailPanel
        transactionId={detailId}
        isOpen={!!detailId}
        onClose={() => setDetailId(null)}
        includeDeleted={showRestoreButton}
        onConfirmed={(updated) => {
          // Note: With Realtime, data will automatically update via WebSocket
          // No need for manual optimistic updates - Realtime will push the change
          
          // auto-open next transaction (speed workflow)
          if (!detailId) return
          const idx = orderedIds.indexOf(detailId)
          if (idx >= 0) {
            const nextId = orderedIds[idx + 1] || null
            setDetailId(nextId)
          }
        }}
      />
    </div>
  )
}
