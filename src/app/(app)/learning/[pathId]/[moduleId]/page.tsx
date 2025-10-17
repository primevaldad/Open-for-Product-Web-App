// src/app/(app)/learning/[pathId]/[moduleId]/page.tsx
import { notFound } from 'next/navigation';

interface LearningModulePageProps {
  params: {
    pathId: string;
    moduleId: string;
  };
}

export default async function LearningModulePage({ params }: { params: Record<string, string> }) {
  const { pathId, moduleId } = params;

  if (!pathId || !moduleId) {
    notFound();
  }

  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Coming Soon!</h1>
      <p>
        Individual modules within learning paths are on the way.
        Stay tuned while we get this feature ready!
      </p>
      <p className="mt-4 text-gray-500">
        Path ID: {pathId} | Module ID: {moduleId}
      </p>
    </div>
  );
}
