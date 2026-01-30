// components/transactions/FiltersBar.tsx
// 筛选和排序栏组件

'use client'

import { useState } from 'react'

export interface Filters {
  dateRange?: { start?: string; end?: string }
  vendorId?: string
  projectId?: string
  /** Receipts status tabs: All | Pending Review | Approved | Needs Attention (merged from Review Queue) */
  statusFilter?: 'all' | 'pending' | 'approved' | 'needs_attention'
  quick?: 'today' | 'week' | 'month' | 'needs-review'
  sortBy?: 'date' | 'amount' | 'vendor'
  sortOrder?: 'asc' | 'desc'
}

export interface FiltersBarProps {
  filters: Filters
  onFiltersChange: (filters: Filters) => void
  vendors?: Array<{ id: string; name: string }>
  projects?: Array<{ id: string; name: string }>
}

// Sort icon SVG
const SortIcon = ({ order }: { order: 'asc' | 'desc' }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {order === 'asc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    )}
  </svg>
)

function hasActiveFilters(filters: Filters): boolean {
  return !!(
    filters.dateRange?.start ||
    filters.dateRange?.end ||
    filters.vendorId ||
    filters.projectId ||
    filters.quick
  )
}

export function FiltersBar({ filters, onFiltersChange, vendors = [], projects = [] }: FiltersBarProps) {
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'vendor'>(filters.sortBy || 'date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(filters.sortOrder || 'desc')

  const handleQuickFilter = (quick: 'today' | 'week' | 'month' | 'needs-review' | null) => {
    if (quick === null) {
      onFiltersChange({ ...filters, quick: undefined })
      return
    }
    
    const today = new Date()
    let start: string | undefined
    let end: string | undefined
    
    if (quick === 'today') {
      start = today.toISOString().split('T')[0]
      end = today.toISOString().split('T')[0]
    } else if (quick === 'week') {
      const weekStart = new Date(today)
      weekStart.setDate(today.getDate() - today.getDay())
      start = weekStart.toISOString().split('T')[0]
      end = today.toISOString().split('T')[0]
    } else if (quick === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      start = monthStart.toISOString().split('T')[0]
      end = today.toISOString().split('T')[0]
    }
    
    onFiltersChange({
      ...filters,
      quick,
      dateRange: quick === 'needs-review' ? filters.dateRange : { start, end },
    })
  }

  const handleSortChange = (newSortBy: 'date' | 'amount' | 'vendor') => {
    const newOrder = sortBy === newSortBy && sortOrder === 'desc' ? 'asc' : 'desc'
    setSortBy(newSortBy)
    setSortOrder(newOrder)
    onFiltersChange({ ...filters, sortBy: newSortBy, sortOrder: newOrder })
  }

  const clearAllFilters = () => {
    onFiltersChange({ sortBy: 'date', sortOrder: 'desc' })
    setSortBy('date')
    setSortOrder('desc')
  }

  const handleStatusFilter = (status: 'all' | 'pending' | 'approved' | 'needs_attention') => {
    onFiltersChange({ ...filters, statusFilter: status })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Receipts 状态标签 (All / Pending Review / Approved / Needs Attention) */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-sm text-gray-600 font-medium">状态:</span>
        <button
          onClick={() => handleStatusFilter('all')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            (filters.statusFilter ?? 'all') === 'all'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => handleStatusFilter('pending')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            filters.statusFilter === 'pending'
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ⚠️ 待审核
        </button>
        <button
          onClick={() => handleStatusFilter('approved')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            filters.statusFilter === 'approved'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ✓ 已批准
        </button>
        <button
          onClick={() => handleStatusFilter('needs_attention')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            filters.statusFilter === 'needs_attention'
              ? 'bg-red-100 text-red-700 border border-red-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ⚠ 需关注
        </button>
      </div>

      {/* 快捷筛选 */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <span className="text-sm text-gray-600 font-medium">快捷筛选:</span>
        <button
          onClick={() => handleQuickFilter('today')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            filters.quick === 'today'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          今天
        </button>
        <button
          onClick={() => handleQuickFilter('week')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            filters.quick === 'week'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          本周
        </button>
        <button
          onClick={() => handleQuickFilter('month')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            filters.quick === 'month'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          本月
        </button>
        <button
          onClick={() => handleQuickFilter('needs-review')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            filters.quick === 'needs-review'
              ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          ⚠️ 需要审核
        </button>
      </div>

      {/* 排序 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600 font-medium">排序:</span>
        <button
          onClick={() => handleSortChange('date')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
            sortBy === 'date'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          按日期
          {sortBy === 'date' && <SortIcon order={sortOrder} />}
        </button>
        <button
          onClick={() => handleSortChange('amount')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
            sortBy === 'amount'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          按金额
          {sortBy === 'amount' && <SortIcon order={sortOrder} />}
        </button>
        <button
          onClick={() => handleSortChange('vendor')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${
            sortBy === 'vendor'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          按供应商
          {sortBy === 'vendor' && <SortIcon order={sortOrder} />}
        </button>
      </div>

      {/* 活动筛选器 */}
      {hasActiveFilters(filters) && (
        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">活动筛选:</span>
          {filters.quick && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {filters.quick === 'today' ? '今天' : filters.quick === 'week' ? '本周' : filters.quick === 'month' ? '本月' : '需要审核'}
            </span>
          )}
          {filters.dateRange?.start && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {filters.dateRange.start} ~ {filters.dateRange.end || '今天'}
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-sm text-blue-600 hover:underline ml-auto"
          >
            清除全部
          </button>
        </div>
      )}
    </div>
  )
}
