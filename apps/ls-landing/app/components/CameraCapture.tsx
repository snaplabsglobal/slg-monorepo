'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './CameraCapture.module.css';

export const CameraCapture = ({ jobId }: { jobId?: string }) => {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [error, setError] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const requestCameraPermission = async () => {
        try {
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: 'environment', // Use back camera on mobile
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    // 1x Zoom Fix: Force zoom to 1 if supported
                    zoom: 1, 
                } as MediaTrackConstraints, // Cast to handle non-standard zoom property
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Apply 1x zoom explicitly if track supports it
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities() as any; // Cast for zoom capability
            if (capabilities.zoom) {
                await track.applyConstraints({
                    advanced: [{ zoom: 1 }] as any
                });
                console.log('Applied 1x zoom fix');
            }

            streamRef.current = stream;
            setHasPermission(true);
            setIsCapturing(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Camera permission denied:', err);
            setHasPermission(false);
            setError('相机权限被拒绝。请在设置中允许访问相机。');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCapturing(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            const imageData = canvas.toDataURL('image/jpeg', 0.95);

            // Job Association Logic: Include jobId in payload
            const payload = {
                image: imageData.substring(0, 50) + '...',
                jobId: jobId || 'unassigned', // Associate with specific job
                timestamp: new Date().toISOString()
            };

            // TODO: Send to AI recognition API
            console.log('Captured image with Job Association:', payload);

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
                <div className={styles.prompt}>
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
            )}
        </div>
    );
};
