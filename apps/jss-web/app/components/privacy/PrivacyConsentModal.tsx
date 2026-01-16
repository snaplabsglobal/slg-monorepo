"use client";

import { useState } from "react";
import { ShieldCheck, Lock, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PrivacyConsentModalProps {
    onConsent: () => void;
}

export default function PrivacyConsentModal({ onConsent }: PrivacyConsentModalProps) {
    const [isOpen, setIsOpen] = useState(true);

    const handleConsent = () => {
        setIsOpen(false);
        onConsent();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-blue-600 p-6 text-white text-center">
                            <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-blue-100" />
                            <h2 className="text-xl font-bold">Privacy Promise</h2>
                            <p className="text-blue-100 text-sm mt-1">Audit Defense & Fair Pay Protection</p>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 text-gray-700">
                            <div className="flex gap-4">
                                <div className="bg-blue-50 p-2 rounded-lg h-fit">
                                    <MapPin className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">How we use location?</h3>
                                    <p className="text-sm mt-1 leading-relaxed">
                                        We <strong>ONLY</strong> check your location at the exact moment you clock in/out to verify you are on site (200m radius). We do <strong>NOT</strong> track your movements or history.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="bg-green-50 p-2 rounded-lg h-fit">
                                    <Lock className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Why do we need this?</h3>
                                    <p className="text-sm mt-1 leading-relaxed">
                                        Proof of presence protects your paycheck from audit disputes. Your data is encrypted and automatically de-identified after 90 days.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-gray-50 border-t flex flex-col gap-3">
                            <button
                                onClick={handleConsent}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                            >
                                I Have Read & Trust
                            </button>
                            <p className="text-xs text-center text-gray-400">
                                By clicking, you consent to the Privacy Terms v1.0
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
