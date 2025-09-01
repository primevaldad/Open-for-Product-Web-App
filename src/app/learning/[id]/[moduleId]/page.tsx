
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/data-cache';
import LearningModuleClientPage from './learning-module-client-page';
import { completeModule } from '@/app/actions/learning';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Module, LearningPath, UserLearningProgress } from '@/lib/types';
import { iconMap } from '@/lib/static-data';
import { FlaskConical } from 'lucide-react';


async function getLearningModulePageData(pathId: string, moduleId: string) {
    const currentUser = await getCurrentUser();
    
    const pathDocRef = doc(db, 'learningPaths', pathId);
    const rawPathDoc = await getDoc(pathDocRef);

    if (!rawPathDoc.exists() || !currentUser) {
        return { path: null, module: null, userProgress: undefined, currentUser, prevModule: null, nextModule: null };
    }

    const rawPath = { id: rawPathDoc.id, ...rawPathDoc.data() };
    const { Icon, ...serializablePath } = { ...rawPath, Icon: iconMap[rawPath.Icon as string] || FlaskConical };
    const module = serializablePath.modules.find((m: Module) => m.id === moduleId) || null;

    const progressQuery = query(collection(db, 'currentUserLearningProgress'), where('userId', '==', currentUser.id), where('pathId', '==', pathId));
    const progressSnapshot = await getDocs(progressQuery);
    const userProgress = progressSnapshot.empty ? undefined : progressSnapshot.docs[0].data() as UserLearningProgress;
    
    const currentModuleIndex = serializablePath.modules.findIndex((m: Module) => m.id === moduleId);
    const prevModule = currentModuleIndex > 0 ? serializablePath.modules[currentModuleIndex - 1] : null;
    const nextModule = currentModuleIndex < serializablePath.modules.length - 1 ? serializablePath.modules[currentModuleIndex + 1] : null;

    return { path: serializablePath, module, userProgress, currentUser, prevModule, nextModule };
}


// This is now a Server Component that fetches all necessary data
export default async function LearningModulePage({ params }: { params: { id: string, moduleId: string } }) {
  
  const { path, module, userProgress, currentUser, prevModule, nextModule } = await getLearningModulePageData(params.id, params.moduleId);
  
  if (!path || !module || !currentUser) {
    notFound();
  }

  return (
    <LearningModuleClientPage
        path={path}
        module={module}
        userProgress={userProgress}
        currentUser={currentUser}
        prevModule={prevModule}
        nextModule={nextModule}
        completeModule={completeModule}
    />
  );
}
