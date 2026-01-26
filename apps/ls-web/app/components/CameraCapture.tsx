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
