
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTransition, useEffect } from 'react'; // Removed unused useState
import { useToast } from '@/hooks/use-toast';
import type { User, LearningPath, UserLearningProgress, Module } from '@/lib/types';
import type { completeModule } from '@/app/actions/learning';

interface LearningModuleClientPageProps {
    path: LearningPath;
    learningModule: Module; // Renamed from 'module'
    userProgress: UserLearningProgress | undefined;
    currentUser: User;
    prevModule: Module | null;
    nextModule: Module | null;
    completeModule: typeof completeModule;
}

interface ModuleHeaderProps {
    path: LearningPath;
    learningModule: Module; // Renamed from 'module'
    prevModule: Module | null;
    nextModule: Module | null;
    onNextModule: () => void;
}

function ModuleHeader({ path, learningModule, prevModule, nextModule, onNextModule }: ModuleHeaderProps) {
    return (
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
            <div className='flex items-center gap-4'>
                <Link href={`/learning/${path.pathId}`}>
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <Link href={`/learning/${path.pathId}`} className="text-sm text-primary hover:underline">{path.title}</Link>
                    <h1 className="text-lg font-semibold md:text-xl">
                        {learningModule.title}
                    </h1>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {prevModule && (
                    <Link href={`/learning/${path.pathId}/${prevModule.moduleId}`}>
                        <Button variant="outline">Previous</Button>
                    </Link>
                )}
                {nextModule ? (
                    <Button onClick={onNextModule}>
                        Next Module <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Link href="/learning">
                        <Button>
                            Finish Path <CheckCircle className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                )}
            </div>
        </header>
    );
}

export default function LearningModuleClientPage({ 
    path, 
    learningModule, // Renamed from 'module'
    userProgress, 
    currentUser, 
    prevModule, 
    nextModule,
    completeModule
}: LearningModuleClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const isCompleted = userProgress?.completedModules.includes(learningModule.moduleId) ?? false;
  
  useEffect(() => {
    if (!userProgress && currentUser) {
      startTransition(async () => {
        await completeModule({ 
          userId: currentUser.id, 
          pathId: path.pathId, 
          moduleId: learningModule.moduleId, 
          completed: false 
        });
      });
    }
  }, [userProgress, currentUser, path.pathId, learningModule.moduleId, completeModule]);

  const handleCompletionToggle = (checked: boolean) => {
    startTransition(async () => {
      const result = await completeModule({ 
        userId: currentUser.id, 
        pathId: path.pathId, 
        moduleId: learningModule.moduleId, 
        completed: checked 
      });

      if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      }
    });
  };

  const handleNextModule = () => {
    if (!isCompleted) {
        handleCompletionToggle(true);
    }
    if (nextModule) {
        router.push(`/learning/${path.pathId}/${nextModule.moduleId}`);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <ModuleHeader 
        path={path} 
        learningModule={learningModule} 
        prevModule={prevModule} 
        nextModule={nextModule} 
        onNextModule={handleNextModule} 
      />
      <main className="flex-1 overflow-auto p-4 md:p-6">
         <div className="mx-auto max-w-3xl space-y-6">
            {learningModule.videoUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-lg border">
                    <iframe 
                        src={learningModule.videoUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={learningModule.title}
                    ></iframe>
                </div>
            )}
             <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">{learningModule.title}</CardTitle>
                    <CardDescription>{learningModule.description}</CardDescription>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none text-foreground">
                    <p>{learningModule.content}</p>
                </CardContent>
             </Card>
             <Card>
                <CardContent className="p-4 flex items-center justify-between">
                     <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="completion" 
                            checked={isCompleted} 
                            onCheckedChange={(e) => handleCompletionToggle(e as boolean)}
                            disabled={isPending}
                        />
                        <Label htmlFor="completion" className={isCompleted ? "text-muted-foreground line-through" : ""}>
                            Mark as Complete
                        </Label>
                    </div>
                    {isPending && <span className="text-sm text-muted-foreground">Saving...</span>}
                </CardContent>
            </Card>
         </div>
      </main>
    </div>
  );
}
