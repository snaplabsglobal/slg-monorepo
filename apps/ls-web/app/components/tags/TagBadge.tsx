// components/tags/TagBadge.tsx
'use client'

// Using SVG icon instead of lucide-react
const XIcon = () => (
  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

export interface TagBadgeProps {
  id: string
  name: string
  displayName?: string | null
  color?: string
  icon?: string | null
  onRemove?: (tagId: string) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function TagBadge({
  id,
  name,
  displayName,
  color = '#0066CC',
  icon,
  onRemove,
  size = 'md',
  className = '',
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const displayText = displayName || name

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      {icon && <span className="text-base">{icon}</span>}
      <span>{displayText}</span>
      {onRemove && (
        <button
          onClick={() => onRemove(id)}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          aria-label={`Remove tag ${displayText}`}
        >
          <XIcon />
        </button>
      )}
    </span>
  )
}
