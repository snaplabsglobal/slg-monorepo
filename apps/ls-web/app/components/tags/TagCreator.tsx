// components/tags/TagCreator.tsx
'use client'

import { useState } from 'react'
// Using SVG icons instead of lucide-react
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)
const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export interface Tag {
  id: string
  name: string
  display_name?: string | null
  color?: string
  icon?: string | null
  category?: string | null
}

export interface TagCreatorProps {
  initialName?: string
  organizationId?: string
  onTagCreated: (tag: Tag) => void
  onCancel: () => void
}

const PRESET_COLORS = [
  '#0066CC', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#3B82F6', // Light Blue
  '#6B7280', // Gray
  '#EC4899', // Pink
]

const CATEGORIES = [
  { value: 'project', label: 'Project' },
  { value: 'client', label: 'Client' },
  { value: 'location', label: 'Location' },
  { value: 'expense_type', label: 'Expense Type' },
  { value: 'tax', label: 'Tax' },
  { value: 'custom', label: 'Custom' },
]

export function TagCreator({
  initialName = '',
  organizationId,
  onTagCreated,
  onCancel,
}: TagCreatorProps) {
  const [name, setName] = useState(initialName)
  const [displayName, setDisplayName] = useState(initialName)
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [icon, setIcon] = useState('')
  const [category, setCategory] = useState('custom')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          display_name: displayName.trim() || name.trim(),
          color,
          icon: icon.trim() || null,
          category,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create tag')
      }

      const data = await response.json()
      onTagCreated(data.tag)
    } catch (error) {
      console.error('Error creating tag:', error)
      alert('Failed to create tag. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Tag Name (required)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (!displayName || displayName === initialName) {
              setDisplayName(e.target.value)
            }
          }}
          placeholder="#Project-Burnaby"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Display Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Burnaby Kitchen Renovation"
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Color
        </label>
        <div className="flex gap-2">
          {PRESET_COLORS.map((presetColor) => (
            <button
              key={presetColor}
              type="button"
              onClick={() => setColor(presetColor)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                color === presetColor
                  ? 'border-gray-900 scale-110'
                  : 'border-gray-300 hover:border-gray-500'
              }`}
              style={{ backgroundColor: presetColor }}
              aria-label={`Select color ${presetColor}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Icon (emoji, optional)
        </label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="🏗️"
          maxLength={2}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded text-sm font-medium hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <CheckIcon />
          {loading ? 'Creating...' : 'Create Tag'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <XIcon />
        </button>
      </div>
    </form>
  )
}
