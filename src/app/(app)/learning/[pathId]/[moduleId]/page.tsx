// src/app/(app)/learning/[pathId]/[moduleId]/page.tsx
import { Metadata } from 'next';
import { notFound } from "next/navigation";
import { findLearningPathsByIds } from '@/lib/data.server';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pathId, moduleId } = await params;
  const paths = await findLearningPathsByIds([pathId]);
  if (paths.length === 0) return { title: 'Learning Path Not Found | Open for Product' };
  const path = paths[0];
  const module = path.modules.find(m => m.moduleId === moduleId);
  if (!module) return { title: 'Module Not Found | Open for Product' };
  return {
    title: `Module - ${module.title} | Open for Product`,
    description: `Part of ${path.title} learning path.`,
  };
}

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
