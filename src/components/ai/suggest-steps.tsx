
"use client";

import { suggestNextSteps } from "@/ai/flows/suggest-next-steps";
import ProjectCard from "@/components/project-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearningPath, HydratedProject, ProjectPathLink, User } from "@/lib/types";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Suggestion = {
  suggestedNextSteps?: string[];
  matchingOpportunities?: string[];
};

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
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestedProject, setSuggestedProject] = useState<HydratedProject | null>(null);

  useEffect(() => {
    async function getSuggestions() {
      if (!suggestedProjects || suggestedProjects.length === 0) {
        setSuggestedProject(null);
        setLoading(false);
        return;
      }

      const bestMatchProject = suggestedProjects[0];
      setSuggestedProject(bestMatchProject);

      if (!aiEnabled) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await suggestNextSteps({
          userSkills: currentUser.interests || [], // Using interests as a proxy for skills
          projectNeeds: bestMatchProject.contributionNeeds.join(', '),
          userInterests: currentUser.interests?.join(', ') || '',
          projectProgress: `Project has ${bestMatchProject.progress}% progress.`,
        });
        setSuggestion(res);
      } catch (e) {
        console.error("AI suggestion failed:", e);
        if (e instanceof Error && e.message === 'AI_SERVICE_DISABLED') {
            console.error("AI Service is disabled. Falling back to default suggestion.");
        }

        if (bestMatchProject.fallbackSuggestion) {
            setSuggestion({
                suggestedNextSteps: [bestMatchProject.fallbackSuggestion],
                matchingOpportunities: [bestMatchProject.tagline],
            });
        } else {
            setSuggestion({
                suggestedNextSteps: [`Check out "${bestMatchProject.name}"! It seems like a great fit for your skills and interests.`],
                matchingOpportunities: [bestMatchProject.tagline],
            });
        }
      } finally {
        setLoading(false);
      }
    }
    getSuggestions();
  }, [suggestedProjects, currentUser, aiEnabled]);

  const projectWithSuggestion = suggestion && suggestedProject
    ? { ...suggestedProject, tagline: suggestion.matchingOpportunities?.[0] || suggestedProject.tagline }
    : suggestedProject;

  const suggestionText = suggestion?.suggestedNextSteps?.[0];

  // Don't render if the user is a guest.
  if (currentUser.role === 'guest') {
      return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/20 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          {aiEnabled ? <Sparkles className="h-6 w-6 text-primary" /> : null}
          {aiEnabled ? "AI-Powered Suggestions" : "Suggested for you"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && !aiEnabled && (
            <div className="text-center text-muted-foreground p-4">
                <p>AI features are currently disabled. Enable them in your settings to get personalized project recommendations.</p>
                <Button asChild className="mt-4">
                  <Link href="/settings">Go to Settings</Link>
                </Button>
            </div>
        )}
        {!loading && aiEnabled && projectWithSuggestion && (
            <ProjectCard
                project={projectWithSuggestion}
                currentUser={currentUser}
                allProjectPathLinks={allProjectPathLinks}
                allLearningPaths={allLearningPaths}
                suggestionText={suggestionText}
            />
        )}
        {!loading && aiEnabled && !projectWithSuggestion && (
            <div className="text-center text-muted-foreground p-4">
                <p>No new project suggestions right now. Explore all projects below!</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
