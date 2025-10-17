// src/app/(app)/learning/[pathId]/[moduleId]/page.tsx
import { notFound } from 'next/navigation';

// 1️⃣ Define the type for params
interface LearningModulePageParams {
  pathId: string;
  moduleId: string;
}

// 2️⃣ Define the props type for the server component
interface LearningModulePageProps {
  params: LearningModulePageParams;
}

// 3️⃣ Export the page component
export default async function LearningModulePage({ params }: LearningModulePageProps) {
  const { pathId, moduleId } = params;

  // 4️⃣ Optional: verify params exist
  if (!pathId || !moduleId) {
    notFound(); // built-in 404
  }

  // 5️⃣ Minimal placeholder
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-3xl font-bold mb-4">Hello World!</h1>
      <p>
        This is a placeholder for the module page.
      </p>
      <p>
        pathId: {pathId} | moduleId: {moduleId}
      </p>
    </div>
  );
}
