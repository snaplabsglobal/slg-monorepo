'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Pen, Square, Save, RotateCcw, Trash2 } from 'lucide-react';

// Types for vector data
type Point = { x: number; y: number };
type ShapeType = 'line' | 'rect';
type DrawingShape = {
    id: string;
    type: ShapeType;
    start: Point;
    end: Point;
    color: string;
    width: number;
};

interface DigitalSketcherProps {
    onSave?: (data: { thumbnail: string; vectors: any; area: number }) => void;
}

export default function DigitalSketcher({ onSave }: DigitalSketcherProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<ShapeType>('rect');
    const [shapes, setShapes] = useState<DrawingShape[]>([]);
    const [currentStart, setCurrentStart] = useState<Point | null>(null);
    const [currentColor, setCurrentColor] = useState('#2563eb'); // Tailwind blue-600

    // Calculate total area of all rectangles
    // Assuming 1px = 1 inch for simplicity in this MVP, or user inputs scale.
    // Let's assume a default scale of 10px = 1 sq ft for visual simple math demo.
    const calculateArea = () => {
        let totalArea = 0;
        shapes.forEach(shape => {
            if (shape.type === 'rect') {
                const width = Math.abs(shape.end.x - shape.start.x);
                const height = Math.abs(shape.end.y - shape.start.y);
                // MVP Calc: Just pixel area for now.
                totalArea += (width * height);
            }
        });
        return totalArea;
    };

    const getCanvasCoordinates = (e: React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent) => {
        setIsDrawing(true);
        setCurrentStart(getCanvasCoordinates(e));
    };

    const draw = (e: React.MouseEvent) => {
        if (!isDrawing || !currentStart || !canvasRef.current) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Clear and redraw existing shapes
        redrawCanvas();

        // Draw current shape preview
        const currentEnd = getCanvasCoordinates(e);
        ctx.beginPath();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = 2;

        if (tool === 'line') {
            ctx.moveTo(currentStart.x, currentStart.y);
            ctx.lineTo(currentEnd.x, currentEnd.y);
        } else if (tool === 'rect') {
            const w = currentEnd.x - currentStart.x;
            const h = currentEnd.y - currentStart.y;
            ctx.strokeRect(currentStart.x, currentStart.y, w, h);

            // Live Dimensions text
            ctx.font = '12px sans-serif';
            ctx.fillStyle = '#666';
            ctx.fillText(`W: ${Math.abs(w)}`, currentStart.x + 5, currentStart.y - 5);
            ctx.fillText(`H: ${Math.abs(h)}`, currentStart.x - 25, currentStart.y + h / 2);
        }
        ctx.stroke();
    };

    const stopDrawing = (e: React.MouseEvent) => {
        if (!isDrawing || !currentStart) return;

        const currentEnd = getCanvasCoordinates(e);

        // Add new shape
        const newShape: DrawingShape = {
            id: crypto.randomUUID(),
            type: tool,
            start: currentStart,
            end: currentEnd,
            color: currentColor,
            width: 2
        };

        setShapes([...shapes, newShape]);
        setIsDrawing(false);
        setCurrentStart(null);
    };

    const redrawCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        drawGrid(ctx, canvas.width, canvas.height);

        shapes.forEach(shape => {
            ctx.beginPath();
            ctx.strokeStyle = shape.color;
            ctx.lineWidth = shape.width;

            if (shape.type === 'line') {
                ctx.moveTo(shape.start.x, shape.start.y);
                ctx.lineTo(shape.end.x, shape.end.y);
            } else if (shape.type === 'rect') {
                const w = shape.end.x - shape.start.x;
                const h = shape.end.y - shape.start.y;
                ctx.strokeRect(shape.start.x, shape.start.y, w, h);

                // Add Area Label in center
                ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
                ctx.fillRect(shape.start.x, shape.start.y, w, h);

                ctx.fillStyle = '#1e3a8a';
                ctx.font = 'bold 12px sans-serif';
                const area = Math.round(Math.abs(w * h));
                ctx.fillText(`${area} px²`, shape.start.x + w / 2 - 20, shape.start.y + h / 2);
            }
            ctx.stroke();
        });
    };

    const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.5;
        const step = 20;

        ctx.beginPath();
        for (let x = 0; x <= w; x += step) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (let y = 0; y <= h; y += step) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();
    };

    const handleSave = () => {
        if (!canvasRef.current) return;
        const thumbnail = canvasRef.current.toDataURL('image/png');
        const area = calculateArea();

        if (onSave) {
            onSave({
                thumbnail,
                vectors: shapes, // The JSON to be stored in project_drawings
                area
            });
        } else {
            alert(`Saved! Total Area: ${area} units. JSON ready for DB.`);
        }
    };

    // Initial draw
    useEffect(() => {
        redrawCanvas();
    }, [shapes]);

    return (
        <div className="flex flex-col gap-4 p-4 border rounded-xl bg-white shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    <button
                        onClick={() => setTool('rect')}
                        className={`p-2 rounded-lg flex items-center gap-2 ${tool === 'rect' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                    >
                        <Square className="w-5 h-5" />
                        <span className="text-sm font-medium">Room (Rect)</span>
                    </button>
                    <button
                        onClick={() => setTool('line')}
                        className={`p-2 rounded-lg flex items-center gap-2 ${tool === 'line' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}
                    >
                        <Pen className="w-5 h-5" />
                        <span className="text-sm font-medium">Wall (Line)</span>
                    </button>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setShapes([])} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 hover:bg-gray-800"
                    >
                        <Save className="w-4 h-4" />
                        Save Sketch
                    </button>
                </div>
            </div>

            <div className="relative border-2 border-dashed border-gray-200 rounded-lg overflow-hidden bg-gray-50 cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full h-[500px] touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
                <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-mono text-gray-500 pointer-events-none">
                    Canvas: 800x600 • Scale: 1px:1unit
                </div>
            </div>
        </div>
    );
}
