'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

interface ReceiptImagePanelProps {
  imageUrl: string | null
}

export function ReceiptImagePanel({ imageUrl }: ReceiptImagePanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0) // degrees
  const [translate, setTranslate] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null
  )

  useEffect(() => {
    // reset transforms when image changes
    setZoom(1)
    setRotation(0)
    setTranslate({ x: 0, y: 0 })
  }, [imageUrl])

  const transform = useMemo(() => {
    return `translate(${translate.x}px, ${translate.y}px) scale(${zoom}) rotate(${rotation}deg)`
  }, [translate.x, translate.y, zoom, rotation])

  const onPointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: translate.x,
      baseY: translate.y,
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setTranslate({ x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Receipt image</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
          >
            Rotate
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1)
              setRotation(0)
              setTranslate({ x: 0, y: 0 })
            }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <span className="text-xs text-gray-500 w-10">Zoom</span>
        <input
          type="range"
          min={0.5}
          max={2}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full"
        />
        <span className="text-xs text-gray-600 w-10 text-right">{Math.round(zoom * 100)}%</span>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
      >
        {!imageUrl ? (
          <div className="h-full w-full flex items-center justify-center text-sm text-gray-500">
            No image
          </div>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              src={imageUrl}
              alt="Receipt"
              className="max-h-full max-w-full select-none"
              style={{ transform }}
              draggable={false}
            />
          </div>
        )}
      </div>
    </div>
  )
}

