import { notFound } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/session.server';
import {
  findUserLearningProgress,
  getAllLearningPaths,
} from '@/lib/data.server';
import LearningModuleClientPage from './learning-module-client-page';
import { completeModule } from '@/app/actions/learning';
import type { Module, User } from '@/lib/types';

/**
 * Converts Firestore timestamps or Date objects to ISO strings.
 */
const toISOString = (timestamp: unknown): string | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp.toISOString();
  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: unknown }).toDate === 'function'
  ) {
    return ((timestamp as { toDate: () => Date }).toDate()).toISOString();
  }
  return timestamp.toString();
};

type LearningModulePageProps = {
  params: {
    pathId: string;
    moduleId: string;
  };
};

export default async function LearningModulePage(props: LearningModulePageProps) {
  const { pathId, moduleId } = props.params;
  
  const rawCurrentUser = await getAuthenticatedUser();

  const learningPaths = await getAllLearningPaths();
  const path = learningPaths.find((p) => p.pathId === pathId);

  if (!path) notFound();

  const module = path.modules.find((m) => m.moduleId === moduleId);
  if (!module) notFound();
  
  // --- SERIALIZATION ---
  const currentUser: User = {
    ...rawCurrentUser,
    createdAt: toISOString(rawCurrentUser.createdAt) ?? undefined,
    lastLogin: toISOString(rawCurrentUser.lastLogin) ?? undefined,
  };

  const userProgress = await findUserLearningProgress(currentUser.id, pathId);

  const currentModuleIndex = path.modules.findIndex((m: Module) => m.moduleId === moduleId);
  const prevModule = currentModuleIndex > 0 ? path.modules[currentModuleIndex - 1] : null;
  const nextModule = currentModuleIndex < path.modules.length - 1
    ? path.modules[currentModuleIndex + 1]
    : null;

  return (
    <LearningModuleClientPage
      pathId={path.pathId}
      pathTitle={path.title}
      module={module}
      userProgress={userProgress}
      currentUser={currentUser}
      prevModule={prevModule}
      nextModule={nextModule}
      completeModule={completeModule}
    />
  );
}
