
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { projectCategories, iconMap } from '@/lib/static-data';
import { cn } from '@/lib/utils';
import type { LearningPath, ProjectCategory, UserLearningProgress } from '@/lib/types';
import { FlaskConical } from 'lucide-react';

interface LearningClientPageProps {
    learningPaths: Omit<LearningPath, 'Icon'>[];
    userProgress: UserLearningProgress[];
}

export default function LearningClientPage({ learningPaths, userProgress }: LearningClientPageProps) {
    const [selectedCategories, setSelectedCategories] = useState<ProjectCategory[]>([]);
    const [showMyPaths, setShowMyPaths] = useState(false);

    const toggleCategory = (category: ProjectCategory) => {
        setSelectedCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };
    
    const startedPathIds = userProgress.map(p => p.pathId);

    const filteredPaths = learningPaths.filter(path => {
        const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(path.category);
        const myPathsMatch = !showMyPaths || startedPathIds.includes(path.id);
        return categoryMatch && myPathsMatch;
    });

    return (
        <>
            <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight">Unlock Your Potential</h2>
                <p className="text-muted-foreground">Gain new skills by contributing to real projects. As you reach milestones, new paths unlock.</p>
            </div>
            
            <div className="mb-6 flex flex-col gap-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex flex-wrap items-center gap-2">
                        {projectCategories.map(({ name, icon: Icon }) => (
                            <Button
                                key={name}
                                variant={selectedCategories.includes(name) ? "default" : "outline"}
                                className="gap-2"
                                onClick={() => toggleCategory(name)}
                            >
                                <Icon className="h-4 w-4" />
                                {name}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 md:ml-auto">
                        <div className="flex items-center space-x-2">
                            <Checkbox id="my-paths" checked={showMyPaths} onCheckedChange={(checked) => setShowMyPaths(!!checked)} />
                            <Label htmlFor="my-paths">My Paths</Label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredPaths.map((path) => {
                    const progress = userProgress.find(p => p.pathId === path.id);
                    const isCompleted = progress && path.modules.length > 0 && progress.completedModules.length === path.modules.length;
                    const Icon = iconMap[path.category as keyof typeof iconMap] || FlaskConical;

                    return (
                        <Link key={path.id} href={path.isLocked ? '#' : `/learning/${path.id}`} className={cn(path.isLocked && "pointer-events-none")}>
                            <Card className={cn("flex flex-col h-full transition-all hover:shadow-lg hover:-translate-y-1", path.isLocked && "bg-muted/50", isCompleted && "border-primary/50")}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                                            <Icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex gap-2">
                                            {isCompleted && <Badge variant="secondary" className="border-green-500/50 bg-green-500/10 text-green-700"> <CheckCircle className="mr-1 h-3 w-3" /> Completed</Badge>}
                                            {path.isLocked && <Badge variant="secondary"> <Lock className="mr-1 h-3 w-3" /> Locked</Badge>}
                                        </div>
                                    </div>
                                    <CardTitle className="pt-4">{path.title}</CardTitle>
                                    <Badge variant="outline" className="w-fit">{path.category}</Badge>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-muted-foreground">{path.description}</p>
                                </CardContent>
                                <CardFooter className="flex justify-between">
                                    <span className="text-sm font-medium text-muted-foreground">{path.duration}</span>
                                    <Button asChild disabled={path.isLocked}>
                                        <span>{isCompleted ? "Review Path" : "Start Path"}</span>
                                    </Button>
                                </CardFooter>
                            </Card>
                        </Link>
                    )
                })}
            </div>
        </>
    );
}
