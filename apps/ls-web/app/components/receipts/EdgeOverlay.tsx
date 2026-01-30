'use client'

import { useState, useCallback, useRef } from 'react'
import type { ReceiptQuad, Point } from '@/app/lib/edge-detection'

interface EdgeOverlayProps {
  /** Display size of the image container */
  displayWidth: number
  displayHeight: number
  /** Image natural size (for coordinate conversion) */
  imageWidth: number
  imageHeight: number
  /** Quad in natural image coordinates */
  edges: ReceiptQuad
  onAdjust: (edges: ReceiptQuad) => void
}

function toDisplay(
  p: Point,
  scaleX: number,
  scaleY: number
): Point {
  return { x: p.x * scaleX, y: p.y * scaleY }
}

function toNatural(
  p: Point,
  scaleX: number,
  scaleY: number
): Point {
  return { x: p.x / scaleX, y: p.y / scaleY }
}

const CORNER_NAMES = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const

export function EdgeOverlay({
  displayWidth,
  displayHeight,
  imageWidth,
  imageHeight,
  edges,
  onAdjust,
}: EdgeOverlayProps) {
  const scaleX = displayWidth / imageWidth
  const scaleY = displayHeight / imageHeight
  const [dragging, setDragging] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const corners: { name: (typeof CORNER_NAMES)[number]; point: Point }[] = [
    { name: 'topLeft', point: edges.topLeft },
    { name: 'topRight', point: edges.topRight },
    { name: 'bottomRight', point: edges.bottomRight },
    { name: 'bottomLeft', point: edges.bottomLeft },
  ]

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, name: (typeof CORNER_NAMES)[number]) => {
      e.preventDefault()
      setDragging(name)
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    []
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const displayX = ((e.clientX - rect.left) / rect.width) * displayWidth
      const displayY = ((e.clientY - rect.top) / rect.height) * displayHeight
      const nat = toNatural(
        { x: Math.max(0, Math.min(displayWidth, displayX)), y: Math.max(0, Math.min(displayHeight, displayY)) },
        scaleX,
        scaleY
      )
      onAdjust({
        ...edges,
        [dragging]: { x: Math.round(nat.x), y: Math.round(nat.y) },
      })
    },
    [dragging, edges, onAdjust, scaleX, scaleY, displayWidth, displayHeight]
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragging) {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
        setDragging(null)
      }
    },
    [dragging]
  )

  const pts = corners.map((c) => toDisplay(c.point, scaleX, scaleY))
  const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full"
      width={displayWidth}
      height={displayHeight}
      viewBox={`0 0 ${displayWidth} ${displayHeight}`}
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <mask id="receipt-edge-mask">
          <rect width="100%" height="100%" fill="white" />
          <polygon points={pointsStr} fill="black" />
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="black"
        fillOpacity="0.5"
        mask="url(#receipt-edge-mask)"
      />
      <polygon
        points={pointsStr}
        fill="none"
        stroke="#f97316"
        strokeWidth="3"
        pointerEvents="none"
      />
      {corners.map((c) => {
        const d = toDisplay(c.point, scaleX, scaleY)
        return (
          <g key={c.name} style={{ pointerEvents: 'auto' }}>
            <circle
              cx={d.x}
              cy={d.y}
              r="20"
              fill="#f97316"
              fillOpacity="0.9"
              className="cursor-move touch-none"
              onPointerDown={(e) => handlePointerDown(e, c.name)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
            <circle
              cx={d.x}
              cy={d.y}
              r="12"
              fill="#ea580c"
              className="pointer-events-none"
            />
          </g>
        )
      })}
    </svg>
  )
}
