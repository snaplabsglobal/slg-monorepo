'use client';

import { useEffect, useRef, useState } from 'react';

interface ManualCropperProps {
    imageSrc: string;
    onConfirm: (croppedImageBlob: Blob) => void;
    onRetake: () => void;
}

export const ManualCropper = ({ imageSrc, onConfirm, onRetake }: ManualCropperProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [corners, setCorners] = useState<{ x: number; y: number }[]>([]);
    const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    // Initialize Cropper
    useEffect(() => {
        if (!imageSrc || !canvasRef.current || !containerRef.current) return;

        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            imageRef.current = img;
            initCropper(img);
        };
    }, [imageSrc]);

    const initCropper = (img: HTMLImageElement) => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        const cw = canvas.width;
        const ch = canvas.height;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const scale = Math.min(cw / iw, ch / ih);

        const w = iw * scale;
        const h = ih * scale;
        const x = (cw - w) / 2;
        const y = (ch - h) / 2;

        setImgRect({ x, y, w, h });

        const padX = w * 0.1;
        const padY = h * 0.1;

        const initialCorners = [
            { x: x + padX, y: y + padY },               // TL
            { x: x + w - padX, y: y + padY },           // TR
            { x: x + w - padX, y: y + h - padY },       // BR
            { x: x + padX, y: y + h - padY }            // BL
        ];

        setCorners(initialCorners);
        drawCropOverlay(canvas, initialCorners);
    };

    const drawCropOverlay = (canvas: HTMLCanvasElement, currentCorners: { x: number; y: number }[]) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Darken outside
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Clear 'hole'
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(currentCorners[0].x, currentCorners[0].y);
        ctx.lineTo(currentCorners[1].x, currentCorners[1].y);
        ctx.lineTo(currentCorners[2].x, currentCorners[2].y);
        ctx.lineTo(currentCorners[3].x, currentCorners[3].y);
        ctx.closePath();
        ctx.clip();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Draw lines
        ctx.strokeStyle = '#0A84FF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentCorners[0].x, currentCorners[0].y);
        ctx.lineTo(currentCorners[1].x, currentCorners[1].y);
        ctx.lineTo(currentCorners[2].x, currentCorners[2].y);
        ctx.lineTo(currentCorners[3].x, currentCorners[3].y);
        ctx.closePath();
        ctx.stroke();

        // Draw handles
        ctx.fillStyle = '#fff';
        currentCorners.forEach(c => {
            ctx.beginPath();
            ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
            ctx.fill();
        });
    };

    // TODO: Implement touch/drag logic (omitted for initial port stub cleanliness)

    return (
        <div style={{ position: 'fixed', inset: 0, background: '#111', zIndex: 30, display: 'flex', flexDirection: 'column' }}>
            <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
                <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />
            </div>
            <div style={{ height: 100, display: 'flex', justifyContent: 'space-between', padding: 20 }}>
                <button onClick={onRetake} style={{ padding: '10px 20px' }}>Retake</button>
                <button onClick={() => console.log('Confirm clicked')} style={{ padding: '10px 20px', background: '#0A84FF', color: '#fff' }}>Confirm</button>
            </div>
        </div>
    );
};
