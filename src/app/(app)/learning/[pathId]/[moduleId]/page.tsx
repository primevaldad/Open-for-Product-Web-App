import { Metadata } from 'next';
import { notFound } from "next/navigation";
import { findLearningPathsByIds, findUserLearningProgress } from '@/lib/data.server';
import { getAuthenticatedUser } from '@/lib/session.server';
import { extractId } from '@/lib/slug';
import { completeModule } from '@/app/actions/learning';
import LearningModuleClientPage from './learning-module-client-page';
import { deepSerialize } from '@/lib/utils.server';

interface PageProps {
  params: Promise<{
    pathId: string;
    moduleId: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pathId, moduleId } = await params;
  const cleanPathId = extractId(pathId);
  const cleanModuleId = extractId(moduleId);
  const paths = await findLearningPathsByIds([cleanPathId]);
  if (paths.length === 0) return { title: 'Learning Path Not Found | Open for Product' };
  const path = paths[0];
  const module = path.modules.find(m => m.moduleId === cleanModuleId);
  if (!module) return { title: 'Module Not Found | Open for Product' };
  return {
    title: `Module - ${module.title} | Open for Product`,
    description: `Part of ${path.title} learning path.`,
  };
}

export default async function LearningModulePage({ params }: PageProps) {
  const { pathId, moduleId } = await params;

  if (!pathId || !moduleId) notFound();

  const cleanPathId = extractId(pathId);
  const cleanModuleId = extractId(moduleId);

  const [currentUser, paths] = await Promise.all([
    getAuthenticatedUser(),
    findLearningPathsByIds([cleanPathId]),
  ]);

  if (paths.length === 0 || !currentUser) {
    notFound();
  }

  const path = paths[0];
  const moduleIndex = path.modules.findIndex(m => m.moduleId === cleanModuleId);
  if (moduleIndex === -1) {
    notFound();
  }

  const module = path.modules[moduleIndex];
  const prevModule = moduleIndex > 0 ? path.modules[moduleIndex - 1] : null;
  const nextModule = moduleIndex < path.modules.length - 1 ? path.modules[moduleIndex + 1] : null;

  const userProgress = await findUserLearningProgress(currentUser.id, cleanPathId);

  return (
    <LearningModuleClientPage
      pathId={cleanPathId}
      pathTitle={path.title}
      module={deepSerialize(module)}
      userProgress={deepSerialize(userProgress)}
      currentUser={deepSerialize(currentUser)}
      prevModule={deepSerialize(prevModule)}
      nextModule={deepSerialize(nextModule)}
      completeModule={completeModule}
    />
  );
}
