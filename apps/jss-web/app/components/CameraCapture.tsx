'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, Package } from 'lucide-react';
import styles from './CameraCapture.module.css';

export const CameraCapture = ({ jobId }: { jobId?: string }) => {
    const supabase = createClient();
    const [mode, setMode] = useState<'scan' | 'warehouse'>('scan');
    const [warehouseSearch, setWarehouseSearch] = useState('');
    const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const checkStockPrice = async (term: string) => {
        if (term.length < 3) return;
        const { data, error } = await supabase.rpc('fn_suggest_stock_price', { search_term: term });
        if (data) setSuggestedPrice(data);
    };

    const requestCameraPermission = async () => {
        try {
            console.log('Requesting camera permission...');

            // iOS Optimization: Avoid specifying 16:9 dimensions to prevent center-cropping.
            // Using 'ideal' with high values asks for the best available resolution from the sensor (usually 4:3).
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 4096 },
                    height: { ideal: 2160 },
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Camera stream obtained');

            // 1x Zoom Fix for Android (and compatible browsers)
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities() as any;
            const settings = track.getSettings();

            console.log('Track capabilities:', capabilities);
            console.log('Track settings:', settings);

            if (capabilities.zoom) {
                console.log(`Zoom capability detected. Range: ${capabilities.zoom.min} - ${capabilities.zoom.max}`);
                // Apply 1x zoom explicitly via advanced constraints to reset lens driver
                try {
                    await track.applyConstraints({
                        advanced: [{ zoom: 1.0 }] as any
                    });
                    console.log('Applied 1x zoom fix via advanced constraints');
                } catch (e) {
                    console.warn('Failed to apply advanced zoom constraint:', e);
                }
            } else {
                console.log('Zoom capability NOT supported by this device/browser (typical for iOS Safari)');
            }

            streamRef.current = stream;
            setHasPermission(true);
            setIsCapturing(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Camera permission/access error:', err);
            setHasPermission(false);
            setError('相机权限被拒绝或无法访问。请检查权限设置。');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
    };

    const dataURLToBlob = (dataURL: string) => {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    };

    const capturePhoto = async () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.95);

            // 1. Convert to Blob
            const blob = dataURLToBlob(imageData);
            const filename = `receipt_${Date.now()}.jpg`;

            try {
                // 2. Get Signed URL
                console.log('Requesting Signed URL...');
                const { data: signData, error: signError } = await supabase.functions.invoke('upload-signer', {
                    body: { filename, contentType: 'image/jpeg' }
                });

                if (signError) throw signError;
                if (!signData?.uploadUrl) throw new Error('No upload URL returned');

                console.log('Uploading to R2...', signData.uploadUrl);

                // 3. Upload to R2
                const uploadRes = await fetch(signData.uploadUrl, {
                    method: 'PUT',
                    body: blob,
                    headers: { 'Content-Type': 'image/jpeg' }
                });

                if (!uploadRes.ok) throw new Error('Failed to upload to R2');

                const publicUrl = signData.publicUrl;
                console.log('Upload Success:', publicUrl);

                // 4. Save to Database (Transaction Stub)
                const { error: dbError } = await supabase.from('transactions').insert({
                    description: 'Pending Receipt Processing...',
                    transaction_date: new Date().toISOString(),
                    total_amount: 0, // Placeholder
                    status: 'pending',
                    receipt_url: publicUrl,
                    org_id: (await supabase.auth.getUser()).data.user?.id // Temporary: Use proper org logic if available
                    // logic usually requires profile join, but for test:
                }).select();

                if (dbError) console.error('DB Insert Error:', dbError);
                else {
                    alert('Upload Complete! Check Dashboard.');
                    if (jobId) {
                        // Associate with Job Logic
                    }
                }

            } catch (e: any) {
                console.error('Upload Process Failed:', e);
                setError('Upload Failed: ' + e.message);
            }

            // Stop camera after capture
            stopCamera();
        }
    };

    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    return (
        <div className={styles.container}>
            {!isCapturing ? (
                <div className="flex bg-gray-100 p-1 rounded-lg mb-4 w-full max-w-xs mx-auto">
                    <button
                        className={`flex-1 py-1 rounded-md text-sm font-medium transition-all ${mode === 'scan' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                        onClick={() => setMode('scan')}
                    >
                        📸 Receipt Scan
                    </button>
                    <button
                        className={`flex-1 py-1 rounded-md text-sm font-medium transition-all ${mode === 'warehouse' ? 'bg-white shadow text-black' : 'text-gray-500'}`}
                        onClick={() => setMode('warehouse')}
                    >
                        📦 Warehouse Out
                    </button>
                </div>

                    {mode === 'warehouse' ? (
                <div className="w-full max-w-xs mx-auto bg-white p-4 rounded-xl shadow-sm text-left">
                    <label className="block text-xs font-bold text-gray-500 mb-1">ITEM NAME</label>
                    <div className="relative mb-3">
                        <input
                            type="text"
                            className="w-full text-lg font-bold border-b-2 border-gray-200 focus:border-black outline-none py-1 pr-8"
                            placeholder="e.g. Drywall Screw"
                            value={warehouseSearch}
                            onChange={(e) => setWarehouseSearch(e.target.value)}
                            onBlur={() => checkStockPrice(warehouseSearch)}
                        />
                        <Search className="w-5 h-5 text-gray-400 absolute right-0 top-2" />
                    </div>

                    {suggestedPrice !== null && (
                        <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center mb-4">
                            <span className="text-xs text-blue-600 font-bold">Suggested Cost</span>
                            <span className="font-mono font-bold text-blue-800">${suggestedPrice.toFixed(2)} / ea</span>
                        </div>
                    )}

                    <button className="w-full bg-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                        <Package className="w-5 h-5" />
                        Confirm Stock Output
                    </button>
                </div>
            ) : (
                <>
                    <div className={styles.icon}>📸</div>
                    <h2 className={styles.title}>拍摄收据</h2>
                    <p className={styles.subtitle}>
                        {jobId ? `当前任务: ${jobId}` : '无关联任务'}
                        <br />
                        点击下方按钮启动相机
                        <br />
                        0延迟 · 100%准确
                    </p>

                    <button
                        onClick={requestCameraPermission}
                        className={styles.startButton}
                    >
                        启动相机 Start Camera
                    </button>

                    {hasPermission === false && (
                        <div className={styles.error}>
                            {error}
                        </div>
                    )}
                </>
            )}
        </div>
    ) : (
        <div className={styles.cameraView}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className={styles.video}
            />

            <div className={styles.controls}>
                <button
                    onClick={stopCamera}
                    className={styles.cancelButton}
                >
                    取消 Cancel
                </button>

                <button
                    onClick={capturePhoto}
                    className={styles.captureButton}
                >
                    <div className={styles.captureRing}>
                        <div className={styles.captureInner} />
                    </div>
                </button>

                <div className={styles.placeholder} />
            </div>

            <div className={styles.hint}>
                对准收据，确保文字清晰可见 (1x)
            </div>
        </div>
    )
}
        </div >
    );
};
