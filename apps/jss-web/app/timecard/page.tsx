"use client";

import { useState } from "react";
import PrivacyConsentModal from "../components/privacy/PrivacyConsentModal";
import TimecardClockIn from "../components/timecard/TimecardClockIn";

export default function TimecardPage() {
    const [hasConsented, setHasConsented] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            {/* Privacy Modal Flow */}
            {!hasConsented && (
                <PrivacyConsentModal onConsent={() => setHasConsented(true)} />
            )}

            {/* Main Clock-In UI (Blurred until consent?) */}
            {/* Actually modal overlays everything, so this is fine. */}

            <div className={`transition-all duration-500 ${!hasConsented ? 'blur-sm scale-95 opacity-50 pointer-events-none' : 'opacity-100 scale-100'}`}>
                {/* Simulate a mobile app shell header */}
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">JobSite Snap</h1>
                    <p className="text-slate-500 text-sm">Employee Portal</p>
                </div>

                <TimecardClockIn />

                <div className="mt-8 text-center text-xs text-gray-400">
                    <p>GPS Verification Enabled • v2.0.1 (Audit Ready)</p>
                </div>
            </div>

        </div>
    );
}
