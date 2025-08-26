
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getHydratedData } from '@/lib/data-cache';

// This is now a Server Component
export default async function LearningPathDetailPage({ params }: { params: { id: string } }) {
  const { learningPaths, currentUserLearningProgress } = await getHydratedData();
  const path = learningPaths.find((p) => p.id === params.id);

  if (!path) {
    notFound();
  }

  const userProgress = (currentUserLearningProgress || []).find(p => p.pathId === path.id);
  const completedModules = userProgress?.completedModules.length ?? 0;
  const totalModules = path.modules.length;
  const progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;
  const firstModuleId = path.modules[0]?.id;

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
       <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
        <Link href="/learning">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold md:text-xl">
          {path.title}
        </h1>
      </header>
      <main className="flex-1 overflow-auto p-4 md:p-6">
         <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <path.Icon className="h-8 w-8 text-primary" />
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
                  <span className="text-sm text-muted-foreground">{completedModules} / {totalModules} Modules</span>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">What you'll learn</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Core concepts of the learning path topic.</li>
                <li>Practical skills through real-world project contributions.</li>
                <li>How to collaborate effectively with a diverse team.</li>
                <li>Industry best practices and modern tools.</li>
              </ul>
            </div>
             <div>
              <h3 className="text-xl font-semibold mb-2">How it works</h3>
              <p className="text-muted-foreground">
                You will join a relevant project and contribute to tasks that align with this learning path. As you complete tasks and reach milestones, you'll unlock new modules and gain certificates to showcase your skills. Our AI assistant will help guide you and suggest relevant opportunities along the way.
              </p>
            </div>
             {firstModuleId && (
              <Link href={`/learning/${path.id}/${firstModuleId}`}>
                <Button size="lg" className="w-full">
                  {completedModules > 0 ? "Continue Path" : "Enroll in Path"}
                </Button>
              </Link>
            )}
          </CardContent>
         </Card>
      </main>
    </div>
  );
}
