// components/tags/TagList.tsx
'use client'

import { TagBadge, TagBadgeProps } from './TagBadge'

export interface TagListProps {
  tags: Array<{
    id: string
    name: string
    display_name?: string | null
    color?: string
    icon?: string | null
  }>
  onRemove?: (tagId: string) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TagList({
  tags,
  onRemove,
  size = 'md',
  className = '',
}: TagListProps) {
  if (tags.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No tags added yet
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <TagBadge
          key={tag.id}
          id={tag.id}
          name={tag.name}
          displayName={tag.display_name}
          color={tag.color}
          icon={tag.icon}
          onRemove={onRemove}
          size={size}
        />
      ))}
    </div>
  )
}
