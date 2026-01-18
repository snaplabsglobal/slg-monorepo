'use client';
import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Edit3, Ruler, Smartphone, Save, Eraser, Trash2, Maximize } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculatePolygonArea, pixelsToSqFt, Point } from '@/utils/geometry';
import { getTerm } from '@/utils/terms';

export default function SketchPage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    const router = useRouter();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);
    const [paths, setPaths] = useState<Point[][]>([]); // Array of completed polygons
    const [sqft, setSqFt] = useState(0);
    const [tool, setTool] = useState<'PEN' | 'ERASER'>('PEN');
    const [saving, setSaving] = useState(false);

    // Load existing drawing
    useEffect(() => {
        const load = async () => {
            const { data } = await supabase
                .from('project_drawings')
                .select('*')
                .eq('project_id', params.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (data && data.data?.paths) {
                setPaths(data.data.paths);
                setSqFt(data.sqft || 0);
                redraw(data.data.paths); // Initial draw
            }
        };
        load();
    }, [params.id]);

    // Draw Logic
    const redraw = (drawPaths: Point[][], activePath?: Point[]) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Grid (Engineering paper style)
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 40) { ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); }
        for (let y = 0; y <= canvas.height; y += 40) { ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); }
        ctx.stroke();

        // Draw Completed Paths
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        drawPaths.forEach(path => {
            if (path.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            path.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.closePath(); // Always close for room logic
            ctx.stroke();

            // Fill lightly
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fill();
        });

        // Draw Active Path
        if (activePath && activePath.length > 0) {
            ctx.strokeStyle = tool === 'ERASER' ? '#ffcccc' : '#0000ff';
            ctx.beginPath();
            ctx.moveTo(activePath[0].x, activePath[0].y);
            activePath.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
        }
    };

    const getPoint = (e: React.PointerEvent): Point => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleStart = (e: React.PointerEvent) => {
        e.preventDefault(); // Prevent scrolling on iPad
        setIsDrawing(true);
        const p = getPoint(e);
        setCurrentPath([p]);
    };

    const handleMove = (e: React.PointerEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const p = getPoint(e);

        // Simple smoothing later, raw points for now
        const newPath = [...currentPath, p];
        setCurrentPath(newPath);
        redraw(paths, newPath);
    };

    const handleEnd = () => {
        setIsDrawing(false);
        if (currentPath.length > 2) {
            // Close loop simply
            const newPaths = [...paths, currentPath];
            setPaths(newPaths);
            redraw(newPaths);

            // Calculate Total SqFt
            let totalAreaPx = 0;
            newPaths.forEach(path => {
                totalAreaPx += calculatePolygonArea(path);
            });
            setSqFt(pixelsToSqFt(totalAreaPx));
        }
        setCurrentPath([]);
    };

    const handleSave = async () => {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check if existing drawing for this project today, or just insert new one?
        // Let's Insert or Update logic is complex without ID, just Insert new "Snapshot"
        // Actually, best to upsert a "Latest Sketch" or keep history
        // Requirement: "Saved to project_drawings"

        const { error } = await supabase.from('project_drawings').insert({
            project_id: params.id,
            name: `Sketch ${new Date().toLocaleTimeString()}`,
            data: { paths },
            sqft: sqft,
            // preview_url: TODO canvas.toDataURL() upload to R2
        });

        if (error) {
            alert('Save failed: ' + error.message);
        } else {
            alert('Sketch Saved!'); // In real app, toast
        }
        setSaving(false);
    };

    const handleClear = () => {
        if (confirm("Clear canvas?")) {
            setPaths([]);
            setSqFt(0);
            redraw([]);
        }
    };

    return (
        <div className="fixed inset-0 bg-white flex overflow-hidden touch-none">
            {/* Left Toolbar (Tools) */}
            <div className="w-20 bg-gray-100 border-r border-gray-200 flex flex-col items-center py-6 gap-6 z-20 shadow-xl">
                <Link href={`/projects/${params.id}`} className="p-3 bg-white rounded-xl shadow-sm hover:scale-105 transition-transform text-gray-700">
                    <ArrowLeft className="w-6 h-6" />
                </Link>

                <div className="h-px w-10 bg-gray-300 my-2" />

                <button
                    onClick={() => setTool('PEN')}
                    className={`p-4 rounded-xl transition-all ${tool === 'PEN' ? 'bg-black text-white shadow-lg scale-110' : 'bg-white text-gray-500 shadow-sm'}`}
                >
                    <Edit3 className="w-6 h-6" />
                    <span className="text-[10px] block mt-1 font-bold">PEN</span>
                </button>

                <button
                    // onClick={() => setTool('RULER')} // Not impl in V1
                    className="p-4 bg-white text-gray-300 rounded-xl shadow-sm cursor-not-allowed"
                >
                    <Ruler className="w-6 h-6" />
                    <span className="text-[10px] block mt-1 font-bold">RULER</span>
                </button>

                <button
                    onClick={() => setTool('ERASER')}
                    className={`p-4 rounded-xl transition-all ${tool === 'ERASER' ? 'bg-red-100 text-red-600 shadow-lg scale-110' : 'bg-white text-gray-500 shadow-sm'}`}
                >
                    <Eraser className="w-6 h-6" />
                    <span className="text-[10px] block mt-1 font-bold">WIPE</span>
                </button>

                <div className="mt-auto">
                    <button onClick={handleClear} className="p-3 text-red-400 hover:text-red-600">
                        <Trash2 className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative bg-white cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    width={1024} // Should be dynamic in real app
                    height={768}
                    className="w-full h-full touch-none"
                    onPointerDown={handleStart}
                    onPointerMove={handleMove}
                    onPointerUp={handleEnd}
                    onPointerLeave={handleEnd}
                />

                {/* Floating Info (Minimal) */}
                <div className="absolute top-6 left-6 bg-black/80 backdrop-blur text-white px-6 py-3 rounded-full font-mono text-lg shadow-2xl pointer-events-none select-none">
                    AREA: <span className="font-bold text-yellow-400">{sqft}</span> SqFt
                </div>
            </div>

            {/* Right Toolbar (Actions/Assets) */}
            <div className="w-20 bg-gray-100 border-l border-gray-200 flex flex-col items-center py-6 gap-6 z-20 shadow-xl">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="p-4 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
                >
                    {saving ? <Smartphone className="w-6 h-6 animate-pulse" /> : <Save className="w-6 h-6" />}
                    <span className="text-[10px] block mt-1 font-bold">SAVE</span>
                </button>

                <div className="h-px w-10 bg-gray-300 my-2" />

                {/* Placeholders for Drag/Drop Assets */}
                <div className="opacity-50 grayscale pointer-events-none flex flex-col gap-4">
                    <div className="w-12 h-12 bg-white rounded border border-gray-300 flex items-center justify-center text-xs font-bold">Door</div>
                    <div className="w-12 h-12 bg-white rounded border border-gray-300 flex items-center justify-center text-xs font-bold">Win</div>
                </div>
            </div>
        </div>
    );
}
