// components/tags/TagSelector.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
// Using SVG icons instead of lucide-react
const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)
const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)
import { TagBadge } from './TagBadge'
import { TagCreator } from './TagCreator'

export interface Tag {
  id: string
  name: string
  display_name?: string | null
  color?: string
  icon?: string | null
  category?: string | null
  usage_count?: number
}

export interface TagSelectorProps {
  selectedTags: string[]
  onTagsChange: (tagIds: string[]) => void
  organizationId?: string
  className?: string
  showCreateButton?: boolean
}

export function TagSelector({
  selectedTags,
  onTagsChange,
  organizationId,
  className = '',
  showCreateButton = true,
}: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showCreator, setShowCreator] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch tags
  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch('/api/tags?type=all')
        const data = await response.json()
        if (data.tags) {
          setTags(data.tags)
          setFilteredTags(data.tags)
        }
      } catch (error) {
        console.error('Error fetching tags:', error)
      }
    }

    fetchTags()
  }, [])

  // Filter tags based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTags(tags)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredTags(
        tags.filter(
          (tag) =>
            tag.name.toLowerCase().includes(query) ||
            tag.display_name?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, tags])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const selectedTagObjects = tags.filter((tag) => selectedTags.includes(tag.id))
  const availableTags = filteredTags.filter(
    (tag) => !selectedTags.includes(tag.id)
  )

  const handleTagToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter((id) => id !== tagId))
    } else {
      onTagsChange([...selectedTags, tagId])
    }
  }

  const handleTagCreated = (newTag: Tag) => {
    setTags([...tags, newTag])
    onTagsChange([...selectedTags, newTag.id])
    setShowCreator(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTagObjects.map((tag) => (
          <TagBadge
            key={tag.id}
            id={tag.id}
            name={tag.name}
            displayName={tag.display_name}
            color={tag.color}
            icon={tag.icon}
            onRemove={() => handleTagToggle(tag.id)}
            size="sm"
          />
        ))}
      </div>

      {/* Input and Dropdown */}
      <div className="relative">
        <div
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-text hover:border-primary focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          onClick={() => setIsOpen(true)}
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="Search or add tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            className="flex-1 outline-none bg-transparent text-sm"
          />
          {isOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XIcon />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {/* Available Tags */}
            {availableTags.length > 0 ? (
              <div className="p-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagToggle(tag.id)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {tag.icon && <span>{tag.icon}</span>}
                      <span className="text-sm font-medium">
                        {tag.display_name || tag.name}
                      </span>
                      {tag.usage_count !== undefined && tag.usage_count > 0 && (
                        <span className="text-xs text-gray-500">
                          ({tag.usage_count})
                        </span>
                      )}
                    </div>
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color || '#0066CC' }}
                    />
                  </button>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No tags found matching "{searchQuery}"
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-gray-500">
                No more tags available
              </div>
            )}

            {/* Create New Tag Button */}
            {showCreateButton && searchQuery && (
              <div className="border-t border-gray-200 p-2">
                {showCreator ? (
                  <TagCreator
                    initialName={searchQuery}
                    organizationId={organizationId}
                    onTagCreated={handleTagCreated}
                    onCancel={() => setShowCreator(false)}
                  />
                ) : (
                  <button
                    onClick={() => setShowCreator(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded transition-colors"
                  >
                    <PlusIcon />
                    <span>Create "{searchQuery}"</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
