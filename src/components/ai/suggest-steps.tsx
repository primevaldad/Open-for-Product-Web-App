"use client";

import ProjectCard from "@/components/project-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearningPath, HydratedProject, ProjectPathLink, User } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface SuggestStepsProps {
    currentUser: User | null; // Can be null
    suggestedProjects: HydratedProject[] | null;
    allProjectPathLinks: ProjectPathLink[];
    allLearningPaths: LearningPath[];
    aiEnabled: boolean;
}

export function SuggestSteps({ currentUser, suggestedProjects, allProjectPathLinks, allLearningPaths, aiEnabled }: SuggestStepsProps) {
  // If there's no user, we don't render anything. This must be done before any hooks are called.
  if (!currentUser) {
    return null;
  }

  const [loading, setLoading] = useState(true);
  const [suggestedProject, setSuggestedProject] = useState<HydratedProject | null>(null);

  useEffect(() => {
    setLoading(true);
    if (suggestedProjects && suggestedProjects.length > 0) {
      setSuggestedProject(suggestedProjects[0]);
    } else {
        setSuggestedProject(null);
    }
    setLoading(false);
  }, [suggestedProjects]);


  // Don't render if the user is a guest.
  if (currentUser.role === 'guest') {
      return null;
  }
  
  // Don't render if there are no suggestions
  if (!suggestedProject) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/20 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          Suggested for you
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && suggestedProject && (
            <ProjectCard
                project={suggestedProject}
                currentUser={currentUser}
                allProjectPathLinks={allProjectPathLinks}
                allLearningPaths={allLearningPaths}
            />
        )}
        {!loading && !aiEnabled && (
            <div className="text-center text-muted-foreground p-4">
                <Button asChild className="mt-4">
                  <Link href="/settings">Activate AI Suggestions</Link>
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}