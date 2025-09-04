
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { LearningPath } from '@/lib/types';
import { iconMap } from '@/lib/static-data';
import { FlaskConical } from 'lucide-react';
import { getCurrentUser, getAllLearningPaths, findUserLearningProgress } from '@/lib/data-cache';
import LearningModuleListItem from '@/components/learning-module-list-item';
import { Separator } from '@/components/ui/separator';
import React from 'react';

function getLearningPathDetailPageData(pathId: string) {
    const currentUser = getCurrentUser();
    const pathData = getAllLearningPaths().find(p => p.id === pathId);

    if (!pathData || !currentUser) return { path: null, userProgress: undefined, Icon: null };

    const Icon = iconMap[pathData.category as keyof typeof iconMap] || FlaskConical;
    const userProgress = findUserLearningProgress(currentUser.id, pathId);

    return { path: pathData, userProgress, Icon };
}


// This is now a Server Component
export default function LearningPathDetailPage({ params }: { params: { id: string } }) {
  const { path, userProgress, Icon } = getLearningPathDetailPageData(params.id);

  if (!path || !Icon) {
    notFound();
  }

  const completedModules = userProgress?.completedModules ?? [];
  const totalModules = path.modules.length;
  const progressPercentage = totalModules > 0 ? (completedModules.length / totalModules) * 100 : 0;
  const isCompleted = totalModules > 0 && completedModules.length === totalModules;
  const firstModuleId = path.modules[0]?.id;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
       <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="/learning">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
            <h1 className="text-lg font-semibold md:text-xl">
                {path.title}
            </h1>
        </div>
        {isCompleted && (
            <div className="flex items-center gap-2 text-lg font-semibold text-green-600">
                <CheckCircle className="h-6 w-6" />
                <span>Path Completed!</span>
            </div>
        )}
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
         <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Icon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl">{path.title}</CardTitle>
            <CardDescription className="text-lg">{path.description}</CardDescription>
             <div className="flex gap-2 pt-2">
                <Badge variant="secondary">{path.category}</Badge>
                <Badge variant="secondary">{path.duration}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Progress</h3>
              <div className="flex items-center gap-4">
                  <Progress value={progressPercentage} className="h-2" />
                  <span className="text-sm text-muted-foreground">{completedModules.length} / {totalModules} Modules</span>
              </div>
            </div>

            <div>
                <h3 className="text-xl font-semibold mb-4">Modules</h3>
                <div className="space-y-2">
                    {path.modules.map((module, index) => (
                        <React.Fragment key={module.id}>
                            <LearningModuleListItem
                                pathId={path.id}
                                module={module}
                                isCompleted={completedModules.includes(module.id)}
                            />
                            {index < path.modules.length - 1 && <Separator />}
                        </React.Fragment>
                    ))}
                </div>
            </div>

             {firstModuleId && (
              <Link href={`/learning/${path.id}/${firstModuleId}`}>
                <Button size="lg" className="w-full mt-6">
                  {isCompleted ? "Review Path" : completedModules.length > 0 ? "Continue Path" : "Enroll in Path"}
                </Button>
              </Link>
            )}
          </CardContent>
         </Card>
      </main>
    </div>
  );
}
