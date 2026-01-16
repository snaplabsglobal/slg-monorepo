"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Locate, MapPin, CheckCircle, AlertTriangle } from "lucide-react";

// Client-side Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TimecardClockIn() {
    const [status, setStatus] = useState<"idle" | "locating" | "success" | "out_of_bounds">("idle");
    const [project, setProject] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleClockIn = () => {
        setStatus("locating");
        setProject(null);
        setErrorMsg(null);

        if (!navigator.geolocation) {
            setErrorMsg("Geolocation is not supported by your browser.");
            setStatus("idle");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                console.log("GPS Obtained:", latitude, longitude);

                try {
                    // Call RPC to find project
                    // Mocking Org ID for now - in real app, fetch from user profile/session
                    const MOCK_ORG_ID = "00000000-0000-0000-0000-000000000000"; // Replace with real logic context
                    // Or better, let backend handle org context if possible, but RPC needs it.
                    // For demo, we rely on the RPC function signature: get_project_by_gps(lat, lng, p_org_id)
                    // We'll skip the RPC call if we don't have a valid Org ID in this standalone demo, 
                    // OR we can simulate the "Success" flow for the UI showcase as requested.

                    // SIMULATION MODE FOR UI DEMO (since we don't have a logged-in user with Org context handy in this raw page)
                    // Real logic:
                    // const { data, error } = await supabase.rpc('get_project_by_gps', { lat: latitude, lng: longitude, p_org_id: orgId });

                    // Let's simulate a network request delay
                    await new Promise(r => setTimeout(r, 2000));

                    // Mock Success (Richmond Reno)
                    // To test failure, we could implement a toggle or randomizer, but let's default to Success as requested.
                    const isSuccess = true;

                    if (isSuccess) {
                        setProject("Richmond Reno"); // Name usually comes from DB join, RPC returned ID. Front-end would fetch name.
                        setStatus("success");
                        // Here we would triggering the R2 Photo Upload Modal next.
                    } else {
                        setStatus("out_of_bounds");
                    }

                } catch (err: any) {
                    console.error(err);
                    setErrorMsg("Failed to match location.");
                    setStatus("out_of_bounds");
                }
            },
            (error) => {
                console.error("Geo Error:", error);
                setErrorMsg("Unable to retrieve location. Please allow GPS access.");
                setStatus("idle");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div className="w-full max-w-sm mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">

            {/* Visual Header */}
            <div className="bg-slate-900 h-48 flex items-center justify-center relative overflow-hidden">
                {/* Radar Effect */}
                {status === "locating" && (
                    <>
                        <div className="absolute w-full h-full bg-blue-500/10 animate-pulse"></div>
                        <div className="absolute w-[300px] h-[300px] border border-blue-400/30 rounded-full animate-ping"></div>
                        <div className="absolute w-[200px] h-[200px] border border-blue-400/50 rounded-full animate-ping delay-75"></div>
                    </>
                )}

                <div className="z-10 text-center text-white">
                    {status === "idle" && <MapPin className="w-16 h-16 mx-auto mb-2 text-gray-400" />}
                    {status === "locating" && <Locate className="w-16 h-16 mx-auto mb-2 text-blue-400 animate-spin-slow" />}
                    {status === "success" && <CheckCircle className="w-16 h-16 mx-auto mb-2 text-green-400" />}
                    {status === "out_of_bounds" && <AlertTriangle className="w-16 h-16 mx-auto mb-2 text-yellow-400" />}
                </div>
            </div>

            {/* Action Content */}
            <div className="p-8 text-center">

                {status === "idle" && (
                    <>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Ready to Work?</h3>
                        <p className="text-gray-500 text-sm mb-6">Clock in to start your shift.</p>
                        <button
                            onClick={handleClockIn}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg transform transition active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Locate className="w-5 h-5" />
                            Clock In Now
                        </button>
                    </>
                )}

                {status === "locating" && (
                    <>
                        <h3 className="text-lg font-bold text-gray-800 animate-pulse">Scanning Location...</h3>
                        <p className="text-gray-500 text-xs mt-2">Matching with Project Geofence...</p>
                    </>
                )}

                {status === "success" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-xl font-bold text-green-600 mb-1">Clock In Successful!</h3>
                        <div className="bg-green-50 p-4 rounded-xl mt-4 border border-green-100">
                            <p className="text-xs text-green-600 uppercase font-bold tracking-wider mb-1">Confirmed Location</p>
                            <p className="text-lg font-bold text-slate-800 flex items-center justify-center gap-1">
                                <MapPin className="w-4 h-4" /> {project}
                            </p>
                        </div>
                    </div>
                )}

                {status === "out_of_bounds" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h3 className="text-lg font-bold text-yellow-600 mb-2">Location Mismatch</h3>
                        <p className="text-gray-500 text-sm mb-6">
                            You seem to be far from the site. <br />
                            {errorMsg}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleClockIn}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg text-sm"
                            >
                                Try Again
                            </button>
                            <button
                                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg text-sm shadow-md"
                            >
                                Request 'Field / Procurement' Mode
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
