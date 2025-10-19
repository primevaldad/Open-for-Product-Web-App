// src/app/(app)/learning/[pathId]/[moduleId]/page.tsx
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    pathId: string;
    moduleId: string;
  }>;
}

export default async function LearningModulePage({ params }: PageProps) {
  const { pathId, moduleId } = await params; // ✅ await added per Next 15 convention

  if (!pathId || !moduleId) notFound();

  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">Module Page</h1>
      <p>
        You're viewing module <strong>{moduleId}</strong> in path{" "}
        <strong>{pathId}</strong>.
      </p>
    </div>
  );
}
