'use client';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Minus, Square, Type, Smartphone, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculatePolygonArea, pixelsToSqFt, snapToAngle, Point } from '@/utils/geometry';
import { getTerm } from '@/utils/terms';

export default function SketchPage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State
    const [tool, setTool] = useState<'LINE' | 'RECT' | 'LABEL'>('LINE');
    const [isDrawing, setIsDrawing] = useState(false);

    // Data
    const [lines, setLines] = useState<Point[][]>([]); // Array of segments [start, end]
    // Note: For SqFt we need loops. Currently just storing lines. 
    // V2: Auto-detect loops from lines. For V1.2 "Area" logic might be "Draw Rect" primarily for area?
    // User Requirement: "Straight Line First". "Draw closed space -> SqFt".
    // Let's assume user draws continuous lines that loop?
    // Let's stick to simple "Paths" structure but enforce straight segments.
    // Actually, "Line" tool usually means single segment. 
    // "Polyline" is better for rooms. Let's make "LINE" behave like "Polyline" (click-click-click)?
    // Requirement says: "Line, Rect, Label". 
    // Let's implement "Drag Line" for single wall, "Drag Rect" for room.

    // Let's stick to the previous "Paths" model but only allow straight lines.
    // A path is [p1, p2, p3...].
    // If Tool=LINE, we are adding to current path? Or just single segments? 
    // "Orthogonal Drafter" usually implies disconnected lines or connected walls.
    // Let's allow [RECT] for instant rooms (Calc Area) and [LINE] for walls.
    // We will calculate area ONLY from RECTs for V1.2 robustness, or closed paths?
    // Let's try to support closed paths calculation if possible.

    const [paths, setPaths] = useState<Point[][]>([]); // Array of [p1, p2, p3, p4] (e.g. rects)
    const [currentStart, setCurrentStart] = useState<Point | null>(null);
    const [currentEnd, setCurrentEnd] = useState<Point | null>(null);
    const [snapLabel, setSnapLabel] = useState<string | null>(null);

    const [sqft, setSqFt] = useState(0);
    const [saving, setSaving] = useState(false);

    // Load
    useEffect(() => {
        const load = async () => {
            const { data } = await supabase.from('project_drawings').select('*').eq('project_id', params.id).order('created_at', { ascending: false }).limit(1).single();
            if (data && data.data?.paths) {
                setPaths(data.data.paths);
                setSqFt(data.sqft || 0);
                requestAnimationFrame(() => redraw(data.data.paths));
            } else {
                requestAnimationFrame(() => redraw([]));
            }
        };
        load();
    }, [params.id]);

    const redraw = (currentPaths: Point[][], activeSegment?: { start: Point, end: Point }) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Grid
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for (let y = 0; y <= canvas.height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        // Draw Paths
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        currentPaths.forEach(path => {
            if (path.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath(); // Auto close for visual solidity
            ctx.stroke();

            // Fill
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fill();
        });

        // Draw Active
        if (activeSegment) {
            ctx.strokeStyle = '#0066ff';
            ctx.lineWidth = 4;
            ctx.beginPath();

            if (tool === 'RECT') {
                const w = activeSegment.end.x - activeSegment.start.x;
                const h = activeSegment.end.y - activeSegment.start.y;
                ctx.rect(activeSegment.start.x, activeSegment.start.y, w, h);
            } else {
                ctx.moveTo(activeSegment.start.x, activeSegment.start.y);
                ctx.lineTo(activeSegment.end.x, activeSegment.end.y);
            }
            ctx.stroke();
        }
    };

    const getPoint = (e: React.PointerEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleStart = (e: React.PointerEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        const p = getPoint(e);
        setCurrentStart(p);
        setCurrentEnd(p);
    };

    const handleMove = (e: React.PointerEvent) => {
        if (!isDrawing || !currentStart) return;
        e.preventDefault();

        let p = getPoint(e);

        // Snapping Logic
        if (tool === 'LINE') {
            const snapped = snapToAngle(currentStart, p, 15); // 15px threshold
            p = snapped.point;
            setSnapLabel(snapped.label);
        } else if (tool === 'RECT') {
            // For Rect, maybe snap to grid? or just free sizing.
            // Let's keep rect free for now, line is strict.
            setSnapLabel(null);
        }

        setCurrentEnd(p);
        redraw(paths, { start: currentStart, end: p });
    };

    const handleEnd = () => {
        setIsDrawing(false);
        setSnapLabel(null);

        if (currentStart && currentEnd) {
            let newPath: Point[] = [];

            if (tool === 'RECT') {
                // Convert rect to 4 points
                newPath = [
                    { x: currentStart.x, y: currentStart.y },
                    { x: currentEnd.x, y: currentStart.y },
                    { x: currentEnd.x, y: currentEnd.y },
                    { x: currentStart.x, y: currentEnd.y }
                ];
            } else {
                // LINE - just 2 points? 
                // If we want closed loops from lines, we need 'Polyline' logic.
                // For v1.2, let's treat a line as a simple segment.
                // But geometry.ts area calc needs CLOSED polygon.
                // If user draws 4 lines to make a box, we need to join them.
                // Complexity!
                // Simplify: tool is 'Orthgoonal Drafter'. 
                // If TOOL=LINE, we just add a 2-point path. Area won't count unless it's a loop.
                // Let's stick to RECT for Area for now to keep it robust.
                newPath = [currentStart, currentEnd];
            }

            if (newPath.length > 1) {
                const newPaths = [...paths, newPath];
                setPaths(newPaths);

                // Recalc sqft
                let totalAreaPx = 0;
                newPaths.forEach(path => totalAreaPx += calculatePolygonArea(path));
                setSqFt(pixelsToSqFt(totalAreaPx));

                redraw(newPaths);
            }
        }

        setCurrentStart(null);
        setCurrentEnd(null);
    };

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase.from('project_drawings').insert({
            project_id: params.id,
            name: `Ortho Sketch ${new Date().toLocaleTimeString()}`,
            data: { paths },
            sqft: sqft
        });
        if (error) alert(error.message);
        else alert('Saved!');
        setSaving(false);
    };

    const handleClear = () => {
        if (confirm("Clear canvas?")) {
            setPaths([]);
            setSqFt(0);
            requestAnimationFrame(() => redraw([]));
        }
    };

    return (
        <div className="fixed inset-0 bg-white flex overflow-hidden touch-none">
            {/* Left Toolbar (Minimalist) */}
            <div className="w-24 bg-gray-100 border-r border-gray-200 flex flex-col items-center py-8 gap-8 z-20 shadow-xl">
                <Link href={`/projects/${params.id}`} className="p-3 bg-white rounded-xl shadow-sm hover:scale-105 transition-transform text-gray-700">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                <div className="h-px w-10 bg-gray-300" />

                <button
                    onClick={() => setTool('LINE')}
                    className={`p-5 rounded-2xl transition-all ${tool === 'LINE' ? 'bg-black text-white shadow-lg scale-110 ring-4 ring-black/20' : 'bg-white text-gray-500 shadow-sm'}`}
                >
                    <Minus className="w-8 h-8" />
                    <span className="text-[10px] block mt-1 font-bold tracking-wider">LINE</span>
                </button>

                <button
                    onClick={() => setTool('RECT')}
                    className={`p-5 rounded-2xl transition-all ${tool === 'RECT' ? 'bg-black text-white shadow-lg scale-110 ring-4 ring-black/20' : 'bg-white text-gray-500 shadow-sm'}`}
                >
                    <Square className="w-8 h-8" />
                    <span className="text-[10px] block mt-1 font-bold tracking-wider">RECT</span>
                </button>

                <button
                    onClick={() => setTool('LABEL')}
                    className={`p-5 rounded-2xl transition-all ${tool === 'LABEL' ? 'bg-black text-white shadow-lg scale-110 ring-4 ring-black/20' : 'bg-white text-gray-500 shadow-sm'}`}
                >
                    <Type className="w-8 h-8" />
                    <span className="text-[10px] block mt-1 font-bold tracking-wider">LABEL</span>
                </button>

                <div className="mt-auto">
                    <button onClick={handleClear} className="p-3 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative bg-white">
                <canvas
                    ref={canvasRef}
                    width={1024}
                    height={768} // Dynamic later
                    className="w-full h-full touch-none cursor-crosshair"
                    onPointerDown={handleStart}
                    onPointerMove={handleMove}
                    onPointerUp={handleEnd}
                    onPointerLeave={handleEnd}
                />

                {/* Snapping Indicator */}
                {snapLabel && isDrawing && currentEnd && (
                    <div
                        className="absolute px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4"
                        style={{ left: currentEnd.x, top: currentEnd.y }}
                    >
                        {snapLabel}
                    </div>
                )}

                {/* Area Indicator */}
                <div className="absolute top-6 left-6 bg-black text-white px-6 py-3 rounded-full font-mono text-xl shadow-2xl pointer-events-none select-none flex items-center gap-3">
                    <span className="text-gray-400 text-sm font-sans font-bold tracking-widest uppercase">Total Area</span>
                    <span className="font-bold text-yellow-400">{sqft}</span>
                    <span className="text-sm text-gray-400">SqFt</span>
                </div>
            </div>

            {/* Right Toolbar (Save) */}
            <div className="absolute top-6 right-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all font-bold tracking-wide"
                >
                    {saving ? <Smartphone className="w-5 h-5 animate-pulse" /> : <Save className="w-5 h-5" />}
                    SAVE PLAN
                </button>
            </div>
        </div>
    );
}
