'use client';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Trash2, Smartphone, Save, Undo, CornerDownLeft, Check, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculatePolygonArea, pixelsToSqFt, snapToAngle, projectPoint, Point } from '@/utils/geometry';

export default function SketchPage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Keypad Logic State
    const [showKeypad, setShowKeypad] = useState(false);
    const [keypadValue, setKeypadValue] = useState('');
    const [pendingVector, setPendingVector] = useState<{ start: Point, angle: number } | null>(null);

    // Drawing State
    const [paths, setPaths] = useState<Point[][]>([]); // Completed polygons/chains
    const [activeChain, setActiveChain] = useState<Point[]>([]); // Current chain being drawn
    const [currentCursor, setCurrentCursor] = useState<Point | null>(null); // Live cursor for rubberbanding
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
            }
        };
        load();
    }, [params.id]);

    // Redraw Loop
    useEffect(() => {
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

        // Draw Completed Paths
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        paths.forEach(path => {
            if (path.length < 2) return;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath();
            ctx.stroke();
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fill();
        });

        // Draw Active Chain
        if (activeChain.length > 0) {
            ctx.strokeStyle = '#0066ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(activeChain[0].x, activeChain[0].y);
            activeChain.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();

            // Draw Rubberband to Cursor
            if (currentCursor) {
                const lastPoint = activeChain[activeChain.length - 1];
                ctx.strokeStyle = '#0066ff';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.lineTo(currentCursor.x, currentCursor.y);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

    }, [paths, activeChain, currentCursor]);

    const getPoint = (e: React.PointerEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (showKeypad) return;
        const p = getPoint(e);

        if (activeChain.length === 0) {
            // Start new chain
            setActiveChain([p]);
        }
        // If mid-chain, the down click doesn't do much, waiting for drag/up to define next segment direction
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (showKeypad || activeChain.length === 0) return;
        const p = getPoint(e);

        // Snapping from last point
        const lastPoint = activeChain[activeChain.length - 1];
        const snapped = snapToAngle(lastPoint, p, 15);

        setCurrentCursor(snapped.point);
        setSnapLabel(snapped.label);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (showKeypad || activeChain.length === 0 || !currentCursor) return;

        const lastPoint = activeChain[activeChain.length - 1];

        // Check closure (snap to start of chain)
        const startPoint = activeChain[0];
        const distToStart = Math.sqrt(Math.pow(currentCursor.x - startPoint.x, 2) + Math.pow(currentCursor.y - startPoint.y, 2));

        if (distToStart < 20 && activeChain.length > 2) {
            // Auto Closure!
            const newPath = [...activeChain];
            // Don't add currentCursor, just close visually by saving path. 
            // Path is [p1, p2, p3...]. Redraw loop closes pLast -> p1.
            const newPaths = [...paths, newPath];
            setPaths(newPaths);

            // Calc Area
            let totalArea = 0;
            newPaths.forEach(p => totalArea += calculatePolygonArea(p));
            setSqFt(pixelsToSqFt(totalArea));

            // Reset
            setActiveChain([]);
            setCurrentCursor(null);
            setSnapLabel(null);
            return;
        }

        // Trigger Keypad logic
        // We know direction.
        const dx = currentCursor.x - lastPoint.x;
        const dy = currentCursor.y - lastPoint.y;
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = angleRad * (180 / Math.PI);

        // Only trigger if dragged some distance
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 10) {
            setPendingVector({ start: lastPoint, angle: angleDeg });
            setKeypadValue(''); // Reset value
            setShowKeypad(true); // Show Input
        }
    };

    const handleKeypadSubmit = () => {
        if (!pendingVector || !keypadValue) return;

        const length = parseFloat(keypadValue);
        if (isNaN(length) || length <= 0) return;

        // Scale: 1 unit input = ? pixels. 
        // V1 Assumption: User inputs FEET, we map 1 ft = 20 pixels or 1 inch = 1 pixel.
        // Let's use 1 ft = 40 pixels for visibility? 
        // Or 1 unit input = 1 pixel? No, precise input implies Feet usually.
        // Reqs: "120 SqFt" calculation implies scale.
        // Geometry util assumes 1px = 1 inch defaults.
        // So if user types "12" (feet), that is 144 inches = 144 pixels.
        const lengthPx = length * 12; // 1 ft = 12px (if 1px=1inch). 
        // Wait, if 1px=1inch, 12 ft = 144 px.
        // Let's use 12 for scaling factor to match 'pixelsToSqFt' divisor of 144.

        const newPoint = projectPoint(pendingVector.start, pendingVector.angle, length * 20); // Scale factor 20 for visibility
        // Wait, if we use arbitrary scale, sqft calc needs to match.
        // geometry.ts: pixelsToSqFt = area / 144. This assumes 1 unit = 1 inch.
        // If I draw 100px line, it thinks it's 100 inches (8.3 ft).
        // If I want input "10" to mean 10 ft, I should generate 120 pixels.
        // Let's use scale 1 ft = 20 pixels for screen fit, then adjust Area Calc?
        // Let's stick to: visual pixels are abstract.
        // Let's just say 1 input unit = 20 pixels.
        // And adjust area calc: (Area in Px^2) / (20*20) = Area in unit^2.
        // pixelsToSqFt devides by 144. 
        // Let's hardcode scale: 1 ft input = 40 pixels. 
        // Then Area / (40*40) = SqFt.

        const SCALE_PX_PER_FT = 40;
        const finalPoint = projectPoint(pendingVector.start, pendingVector.angle, length * SCALE_PX_PER_FT);

        setActiveChain([...activeChain, finalPoint]);

        setShowKeypad(false);
        setPendingVector(null);
        setKeypadValue('');
    };

    const handleSave = async () => {
        setSaving(true);
        // Recalc Area correctly based on scale
        let totalAreaPx = 0;
        paths.forEach(p => totalAreaPx += calculatePolygonArea(p));
        const SCALE_PX_PER_FT = 40;
        const realSqFt = Math.round((totalAreaPx / (SCALE_PX_PER_FT * SCALE_PX_PER_FT)) * 100) / 100;

        const { error } = await supabase.from('project_drawings').insert({
            project_id: params.id,
            name: `Vector Sketch ${new Date().toLocaleTimeString()}`,
            data: { paths },
            sqft: realSqFt
        });
        if (error) alert(error.message);
        else alert('Saved!');
        setSaving(false);
    };

    const handleClear = () => {
        if (confirm("Clear canvas?")) {
            setPaths([]);
            setActiveChain([]);
            setSqFt(0);
        }
    };

    // Keypad Component
    const Keypad = () => (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-100 p-6 rounded-t-3xl shadow-2xl z-50 flex flex-col items-center animate-in slide-in-from-bottom">
            <div className="w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-500 font-bold text-sm uppercase tracking-wider">Length (Feet)</span>
                    <button onClick={() => setShowKeypad(false)}><X className="w-6 h-6 text-gray-400" /></button>
                </div>
                <div className="text-4xl font-mono font-bold bg-white p-4 rounded-xl text-center mb-6 shadow-inner border border-gray-200">
                    {keypadValue || '0'} <span className="text-gray-300 text-2xl">ft</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((k) => (
                        <button
                            key={k}
                            onClick={() => setKeypadValue(curr => curr + k)}
                            className="bg-white p-4 rounded-xl font-bold text-xl shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-gray-700"
                        >
                            {k}
                        </button>
                    ))}
                    <button
                        onClick={() => setKeypadValue(curr => curr.slice(0, -1))}
                        className="bg-red-50 p-4 rounded-xl font-bold text-xl shadow-sm hover:bg-red-100 text-red-500"
                    >
                        <CornerDownLeft className="w-6 h-6 mx-auto" />
                    </button>
                </div>
                <button
                    onClick={handleKeypadSubmit}
                    className="w-full mt-6 bg-blue-600 text-white p-5 rounded-xl font-bold text-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    CONFIRM <Check className="w-6 h-6" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-white flex overflow-hidden touch-none">
            {/* Top Bar for Area & Save (Merged) */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start pointer-events-none z-10">
                <Link href={`/projects/${params.id}`} className="bg-white/90 backdrop-blur p-3 rounded-xl shadow-sm pointer-events-auto border border-gray-200 text-gray-700">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                <div className="bg-black/90 backdrop-blur text-white px-8 py-3 rounded-full font-mono text-xl shadow-2xl flex items-center gap-4">
                    <span className="text-gray-400 text-xs font-sans font-bold tracking-widest uppercase">AREA</span>
                    <div>
                        <span className="font-bold text-yellow-400 text-2xl">{sqft}</span>
                        <span className="text-sm text-gray-400 ml-1">SQFT</span>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg font-bold pointer-events-auto hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Save className="w-5 h-5" /> SAVE
                </button>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative bg-white cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    width={1180} // iPad Pro width approx
                    height={820}
                    className="w-full h-full touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                />

                {snapLabel && currentCursor && !showKeypad && (
                    <div
                        className="absolute px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4"
                        style={{ left: currentCursor.x, top: currentCursor.y }}
                    >
                        {snapLabel}
                    </div>
                )}
            </div>

            {/* Helper Hint */}
            {!showKeypad && activeChain.length === 0 && (
                <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none opacity-50">
                    <p className="text-sm text-gray-400 font-medium">Drag and release to create walls</p>
                </div>
            )}

            {/* Tools (Clear) */}
            <div className="absolute bottom-10 left-10 pointer-events-auto">
                <button onClick={handleClear} className="p-4 bg-gray-100 text-gray-500 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm">
                    <Trash2 className="w-6 h-6" />
                </button>
            </div>

            {/* Keypad Overlay */}
            {showKeypad && <Keypad />}
        </div>
    );
}
