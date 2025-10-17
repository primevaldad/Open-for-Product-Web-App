// src/app/(app)/learning/[pathId]/[moduleId]/page.tsx
import { notFound } from 'next/navigation';

interface LearningModulePageProps {
  params: {
    pathId: string;
    moduleId: string;
  };
}

export default function LearningModulePage({ params }: LearningModulePageProps) {
  // Optional: verify that pathId/moduleId exist in some way
  // For now, just show a placeholder
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Coming Soon!</h1>
      <p>
        Individual modules within learning paths are on the way. 
        Stay tuned while we get this feature ready!
      </p>
    </div>
  );
}
