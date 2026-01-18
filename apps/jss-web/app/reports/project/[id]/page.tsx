'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getTerm } from '@/utils/terms';
import Image from 'next/image';

export default function ProjectReportPage({ params }: { params: { id: string } }) {
    const supabase = createClient();
    const [project, setProject] = useState<any>(null);
    const [org, setOrg] = useState<any>(null);
    const [featuredPhotos, setFeaturedPhotos] = useState<any[]>([]);

    useEffect(() => {
        const load = async () => {
            // Get Project
            const { data: p } = await supabase.from('projects').select('*').eq('id', params.id).single();
            if (p) {
                setProject(p);
                // Get Org Branding
                const { data: o } = await supabase.from('organizations').select('*').eq('id', p.organization_id).single();
                setOrg(o);

                // Get Featured Media
                const { data: m } = await supabase
                    .from('project_media')
                    .select('*')
                    .eq('project_id', params.id)
                    .eq('is_featured', true)
                    .limit(6); // Max 6 for first page grid
                if (m) setFeaturedPhotos(m);
            }
        };
        load();
    }, [params.id]);

    if (!project || !org) return <div className="p-12 text-center text-gray-400">Generatiing Report...</div>;

    const brandColor = org.branding_json?.primary_color || '#000000';

    return (
        <div className="bg-white min-h-screen text-black">
            {/* Print Header */}
            <header className="p-12 text-white" style={{ backgroundColor: brandColor }}>
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight mb-2">{org.name}</h1>
                        <p className="opacity-80 text-sm max-w-sm">{org.address || 'Certified Professional Services'}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm opacity-70 uppercase tracking-widest mb-1">{getTerm('PROJECT')} REPORT</div>
                        <h2 className="text-2xl font-bold">{project.name}</h2>
                        <p className="text-sm opacity-90">{project.address}</p>
                    </div>
                </div>
            </header>

            <main className="p-12 max-w-5xl mx-auto">
                {/* Executive Summary */}
                <section className="mb-12 grid grid-cols-2 gap-12">
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Status & Timeline</h3>
                        <div className="text-5xl font-light text-gray-900 mb-2">{project.status}</div>
                        <p className="text-gray-500">Status Code: <span className="font-mono">{project.status_code || '00'}</span></p>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Client</h3>
                        <div className="text-2xl font-bold text-gray-900 mb-1">{project.client_name || 'Valued Client'}</div>
                        <p className="text-gray-600 italic">"Delivering excellence one pixel at a time."</p>
                    </div>
                </section>

                <hr className="border-gray-100 mb-12" />

                {/* Featured Photos Grid (Star Photos) */}
                {featuredPhotos.length > 0 && (
                    <section className="mb-12">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Site Highlights</h3>
                        <div className="grid grid-cols-2 gap-6">
                            {featuredPhotos.map((photo, i) => (
                                <div key={photo.id} className={`relative rounded-xl overflow-hidden bg-gray-100 shadow-sm ${i === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'}`}>
                                    {/* Placeholder for Image - use standard img for print compatibility usually better than Next Image with loader issues in pure HTML export context sometimes, but Next Image is fine */}
                                    <img
                                        src={photo.storage_path ?
                                            `https://YOUR_R2_URL/${photo.storage_path}` : // TODO: Need real public URL logic
                                            'https://placehold.co/600x400/png?text=Site+Photo'
                                        }
                                        alt="Site Photo"
                                        className="object-cover w-full h-full"
                                    />
                                    {photo.ai_tags && (
                                        <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs">
                                            {photo.ai_tags[0] || 'Featured'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Disclaimer Footer */}
                <footer className="mt-24 pt-12 border-t border-gray-100 text-center text-xs text-gray-400">
                    <p>{org.branding_json?.disclaimer || 'This report is generated by JobSite Snap. All rights reserved.'}</p>
                </footer>
            </main>
        </div>
    );
}
