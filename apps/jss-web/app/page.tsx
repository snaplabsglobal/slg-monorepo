'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import { ArrowRight, MapPin, Loader2 } from 'lucide-react';

export default function Home() {
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchActive = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('get_recent_active_projects', { p_user_id: user.id });
        if (data) setActiveProjects(data);
      }
      setLoading(false);
    };
    fetchActive();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 pt-12 pb-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Good Morning, Boss</h1>
        <p className="text-gray-500">Ready to snap today?</p>
      </div>

      {/* Active Projects Fast Lane */}
      <div className="px-6 mt-8">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Active Projects</h2>
          <Link href="/projects" className="text-sm text-blue-600 font-medium">View All</Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : (
          <div className="space-y-4">
            {activeProjects.map((project) => (
              <Link
                key={project.project_id}
                href={`/projects/${project.project_id}`}
                className="block bg-white rounded-2xl p-5 shadow-sm active:scale-[0.98] transition-all border border-transparent hover:border-blue-500"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{project.project_name}</h3>
                      <p className="text-gray-500 text-sm mt-0.5">{project.project_address || 'No address set'}</p>
                    </div>
                  </div>
                  <div className="bg-gray-100 p-2 rounded-full text-gray-400">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))}

            {activeProjects.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-300">
                <p className="text-gray-400 mb-4">No active projects found recently.</p>
                <Link href="/projects/new" className="inline-block px-5 py-2 bg-black text-white rounded-full text-sm font-medium">
                  Create First Project
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
