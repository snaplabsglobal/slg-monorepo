'use client';
import { getTerm, getTermPlural } from '@/utils/terms'; // Auto-added by me if not present, but better to be explicit in imports. Wait, I should add import first or in the same block?
// Better to simple replace strings if I can, but I need the import.
// Let's replace the whole file content or large chunks?
// The file is small (80 lines). I can do it in two chunks: imports and body.
// Actually, let's just do `multi_replace` or `replace` carefully.

// Adding import:
import { getTerm, getTermPlural } from '@/utils/terms';

export default function Home() {
  // ...
  <h2 className="text-lg font-semibold text-gray-900">Active {getTermPlural('PROJECT')}</h2>
  // ...
  {
    activeProjects.map((project) => (
      // ...
      {
        activeProjects.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-300">
            <p className="text-gray-400 mb-4">No active {getTermPlural('PROJECT').toLowerCase()} found recently.</p>
            <Link href="/projects/new" className="inline-block px-5 py-2 bg-black text-white rounded-full text-sm font-medium">
              Create First {getTerm('PROJECT')}
            </Link>
          </div>
        )
      }

          </div >
        )
  }
      </div >
    </main >
  );
}
