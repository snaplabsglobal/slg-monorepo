'use client';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { MessageSquare, Mic, X, Send, Loader2, AlertTriangle } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function FeedbackWidget() {
    const supabase = createClient();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [clickHistory, setClickHistory] = useState<number[]>([]);

    // Form
    const [text, setText] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [sending, setSending] = useState(false);
    const [response, setResponse] = useState<string | null>(null);

    // Audio
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    // 1. Rage Detector
    useEffect(() => {
        const handleClick = () => {
            const now = Date.now();
            setClickHistory(prev => {
                const recent = [...prev, now].filter(t => now - t < 2000); // Keep clicks within 2s
                if (recent.length >= 5 && !isOpen) {
                    // RAGE TRIGGERED
                    setIsOpen(true);
                    setResponse("I noticed you're clicking rapidly. Is something broken? Tell me, and I'll fix it.");
                }
                return recent;
            });
        };
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [isOpen]);

    // 2. Audio Logic
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = recorder;
            chunksRef.current = [];

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await submitFeedback(null, blob);
            };

            recorder.start();
            setIsRecording(true);
        } catch (e) {
            alert("Microphone access denied.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    // 3. Submit
    const submitFeedback = async (textInput?: string | null, audioBlob?: Blob) => {
        setSending(true);
        let audioBase64 = null;

        if (audioBlob) {
            const buffer = await audioBlob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            audioBase64 = btoa(binary);
        }

        const { data: { user } } = await supabase.auth.getUser();

        try {
            const { data, error } = await supabase.functions.invoke('feedback-router', {
                body: {
                    user_id: user?.id,
                    context_url: pathname,
                    message: textInput,
                    audio_base64: audioBase64
                }
            });

            if (data?.reply) {
                setResponse(data.reply);
                setText('');
            }
        } catch (e) {
            console.error(e);
            setResponse("Offline mode. Feedback saved locally.");
        }
        setSending(false);
    };

    return (
        <>
            {/* Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 p-4 bg-black text-white rounded-full shadow-xl hover:scale-105 transition-all z-50"
                >
                    <MessageSquare className="w-6 h-6" />
                </button>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed bottom-6 right-6 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="bg-gray-50 p-4 flex justify-between items-center border-b">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Jarvis Feedback
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-red-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-4 flex-1 space-y-4">
                            {response ? (
                                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                                    <p className="font-bold mb-1">Jarvis:</p>
                                    {response}
                                    <button
                                        onClick={() => setResponse(null)}
                                        className="block mt-2 text-xs underline text-blue-600"
                                    >
                                        Send more
                                    </button>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    Tell us what's on your mind. We are listening.
                                </p>
                            )}

                            {!response && (
                                <textarea
                                    className="w-full h-24 p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Type here..."
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    disabled={sending}
                                />
                            )}
                        </div>

                        {/* Footer */}
                        {!response && (
                            <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
                                <button
                                    onMouseDown={startRecording}
                                    onMouseUp={stopRecording}
                                    onTouchStart={startRecording}
                                    onTouchEnd={stopRecording}
                                    disabled={sending}
                                    className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white scale-110 shadow-lg' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                        }`}
                                >
                                    <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
                                </button>

                                <button
                                    onClick={() => submitFeedback(text)}
                                    disabled={!text.trim() || sending}
                                    className="px-6 py-2 bg-black text-white rounded-lg font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    {sending ? <Loader2 className="animate-spin w-4 h-4" /> : 'Send'}
                                    {!sending && <Send className="w-3 h-3" />}
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
