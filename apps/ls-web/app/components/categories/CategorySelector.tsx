// components/categories/CategorySelector.tsx
'use client'

import { useState, useEffect } from 'react'
// Using SVG icons instead of lucide-react
const CheckIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)
const SparklesIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

export interface AccountingCategory {
  id: string
  code: string
  name_en: string
  tax_deduction_rate: number
  cra_code?: string | null
  is_tax_deductible: boolean
}

export interface CategorySelectorProps {
  transactionId: string
  selectedCategoryId?: string | null
  onCategoryChange: (categoryId: string) => void
  confidence?: number | null
  userConfirmed?: boolean
  showAutoAssign?: boolean
  className?: string
}

export function CategorySelector({
  transactionId,
  selectedCategoryId,
  onCategoryChange,
  confidence,
  userConfirmed = false,
  showAutoAssign = true,
  className = '',
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<AccountingCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/categories')
        const data = await response.json()
        if (data.categories) {
          setCategories(data.categories)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }

    fetchCategories()
  }, [])

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId)
  const filteredCategories = categories.filter(
    (cat) =>
      !searchQuery ||
      cat.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAutoAssign = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/transactions/${transactionId}/category/auto`, {
        method: 'POST',
      })
      const data = await response.json()
      if (data.success && data.categoryId) {
        onCategoryChange(data.categoryId)
      }
    } catch (error) {
      console.error('Error auto-assigning category:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedCategoryId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/transactions/${transactionId}/category`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: selectedCategoryId, action: 'confirm' }),
      })
      if (response.ok) {
        // Category confirmed
      }
    } catch (error) {
      console.error('Error confirming category:', error)
    } finally {
      setLoading(false)
    }
  }

  const deductionRate = selectedCategory
    ? Math.round(selectedCategory.tax_deduction_rate * 100)
    : null

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        📂 会计科目（税务用）
      </label>

      {/* Selected Category Display */}
      {selectedCategory ? (
        <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {selectedCategory.name_en}
              </div>
              {selectedCategory.cra_code && (
                <div className="text-xs text-gray-500 mt-0.5">
                  CRA Code: {selectedCategory.cra_code}
                </div>
              )}
            </div>
            {!userConfirmed && (
              <div className="flex items-center gap-2">
                {confidence !== null && confidence !== undefined && (
                  <span className="text-xs text-gray-500">
                    {Math.round(confidence * 100)}%
                  </span>
                )}
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
                >
                  <CheckIcon />
                </button>
              </div>
            )}
            {userConfirmed && (
              <span className="text-xs text-green-600 font-medium">✓ 已确认</span>
            )}
          </div>
          {deductionRate !== null && (
            <div className="text-xs text-gray-600 mt-1">
              {deductionRate === 100
                ? '✅ 100% 可税务抵扣'
                : `⚠️ ${deductionRate}% 可税务抵扣`}
            </div>
          )}
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg p-3 bg-yellow-50">
          <div className="text-sm text-gray-600">未分配会计科目</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          {selectedCategory ? '更改科目' : '选择科目'}
        </button>
        {showAutoAssign && !selectedCategory && (
          <button
            onClick={handleAutoAssign}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-primary/10 text-primary rounded hover:bg-primary/20 disabled:opacity-50 transition-colors"
          >
            <SparklesIcon />
            AI 自动分类
          </button>
        )}
      </div>

      {/* Category Picker Dropdown */}
      {isOpen && (
        <div className="border border-gray-200 rounded-lg shadow-lg bg-white max-h-64 overflow-y-auto">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="搜索科目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="p-2">
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    onCategoryChange(category.id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-50 transition-colors ${
                    selectedCategoryId === category.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{category.name_en}</div>
                      {category.cra_code && (
                        <div className="text-xs text-gray-500">
                          {category.cra_code} •{' '}
                          {Math.round(category.tax_deduction_rate * 100)}% 可抵扣
                        </div>
                      )}
                    </div>
                    {selectedCategoryId === category.id && (
                      <CheckIcon />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                未找到匹配的科目
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
