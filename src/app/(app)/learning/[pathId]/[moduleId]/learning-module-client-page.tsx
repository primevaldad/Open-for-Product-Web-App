
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useTransition, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User, UserLearningProgress, Module } from '@/lib/types';
import type { completeModule } from '@/app/actions/learning';

interface LearningModuleClientPageProps {
    pathId: string;
    pathTitle: string;
    module: Module;
    userProgress: UserLearningProgress | undefined;
    currentUser: User;
    prevModule: Module | null;
    nextModule: Module | null;
    completeModule: typeof completeModule;
}

function ModuleHeader({ pathId, pathTitle, module, prevModule, nextModule, onNextModule }: { pathId: string, pathTitle: string, module: Module, prevModule: Module | null, nextModule: Module | null, onNextModule: () => void }) {
    return (
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
            <div className='flex items-center gap-4'>
                <Link href={`/learning/${pathId}`}>
                    <Button variant="outline" size="icon">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <Link href={`/learning/${pathId}`} className="text-sm text-primary hover:underline">{pathTitle}</Link>
                    <h1 className="text-lg font-semibold md:text-xl">
                        {module.title}
                    </h1>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {prevModule && (
                    <Link href={`/learning/${pathId}/${prevModule.moduleId}`}>
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
    pathId,
    pathTitle,
    module, 
    userProgress, 
    currentUser, 
    prevModule, 
    nextModule,
    completeModule
}: LearningModuleClientPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const isCompleted = userProgress?.completedModules.includes(module.moduleId) ?? false;
  
  // Effect to auto-enroll user if they visit a module without having any progress for the path.
  useEffect(() => {
    if (!userProgress && currentUser) {
      // This creates the progress record, effectively "enrolling" them.
      // We pass completed: false because they haven't completed this module yet.
      startTransition(async () => {
        await completeModule({ 
          userId: currentUser.id, 
          pathId: pathId, 
          moduleId: module.moduleId, 
          completed: false 
        });
      });
    }
  }, [userProgress, currentUser, pathId, module.moduleId, completeModule]);

  const handleCompletionToggle = (checked: boolean) => {
    startTransition(async () => {
      const result = await completeModule({ 
        userId: currentUser.id, 
        pathId: pathId, 
        moduleId: module.moduleId, 
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
        router.push(`/learning/${pathId}/${nextModule.moduleId}`);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <ModuleHeader {...{ pathId, pathTitle, module, userProgress, currentUser, prevModule, nextModule, onNextModule: handleNextModule }} />
      <main className="flex-1 overflow-auto p-4 md:p-6">
         <div className="mx-auto max-w-3xl space-y-6">
            {module.videoUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-lg border">
                    <iframe 
                        src={module.videoUrl}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={module.title}
                    ></iframe>
                </div>
            )}
             <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent className="prose prose-sm max-w-none text-foreground">
                    <p>{module.content}</p>
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
