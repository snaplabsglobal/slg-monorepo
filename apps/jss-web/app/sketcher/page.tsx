'use client';

import DigitalSketcher from '../components/sketcher/DigitalSketcher';

export default function SketcherPage() {
    const handleSaveDrawing = (data: any) => {
        console.log("Saving Drawing Data:", data);
        alert(`Mock Save Successful!\n\nArea: ${data.area} units\nVectors: ${data.vectors.length} shapes`);
        // Future: Call Supabase RPC to insert into project_drawings
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Digital Sketcher (Beta)</h1>
                    <p className="text-gray-500">The "Napkin Sketch" tool for field measurements.</p>
                </div>

                <DigitalSketcher onSave={handleSaveDrawing} />

                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                    <strong>Pro Tip:</strong> Draw a closed rectangle to see the automated Area calculation.
                    This area data will feed directly into the Estimation Engine for flooring/paint calculations.
                </div>
            </div>
        </div>
    );
}
