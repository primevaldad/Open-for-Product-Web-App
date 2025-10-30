
"use client";

import { suggestNextSteps } from "@/ai/flows/suggest-next-steps";
import ProjectCard from "@/components/project-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearningPath, HydratedProject, ProjectPathLink, User } from "@/lib/types";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

type Suggestion = {
  suggestedNextSteps?: string[];
  matchingOpportunities?: string[];
};

interface SuggestStepsProps {
    currentUser: User;
    allProjects: HydratedProject[];
    allProjectPathLinks: ProjectPathLink[];
    allLearningPaths: LearningPath[];
}

export function SuggestSteps({ currentUser, allProjects, allProjectPathLinks, allLearningPaths }: SuggestStepsProps) {
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestedProject, setSuggestedProject] = useState<HydratedProject | null>(null);

  // Memoize the project finding logic so it doesn't re-run on every render
  const bestMatchProject = useMemo(() => {
    // Filter out projects the user has already joined
    const availableProjects = allProjects.filter(p => !p.team.some(member => member.userId === currentUser.id));

    if (availableProjects.length === 0) {
        return null; // No projects available to suggest
    }
    
    // Try to find a project that matches the user's interests
    if (currentUser.interests && currentUser.interests.length > 0) {
      const matchingProjects = availableProjects.filter(p => 
        p.contributionNeeds.some(need => currentUser.interests?.includes(need))
      );
      if (matchingProjects.length > 0) {
        // For now, just pick the first match. Could be improved with better ranking.
        return matchingProjects[0];
      }
    }

    // Fallback: If no interest match, suggest the first available project
    return availableProjects[0];
  }, [allProjects, currentUser]);

  useEffect(() => {
    async function getSuggestions() {
      if (!bestMatchProject) {
        setSuggestedProject(null);
        setLoading(false);
        return;
      }

      setSuggestedProject(bestMatchProject);

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
        // When AI fails, gracefully fall back to a predefined suggestion
        if (e instanceof Error && e.message === 'AI_SERVICE_DISABLED') {
            // Log the specific error for developers, but show the same fallback to the user
            console.error("AI Service is disabled. Falling back to default suggestion.");
        }

        if (bestMatchProject.fallbackSuggestion) {
            setSuggestion({
                suggestedNextSteps: [bestMatchProject.fallbackSuggestion],
                matchingOpportunities: [bestMatchProject.tagline],
            });
        } else {
            // A graceful fallback when the AI fails
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
  }, [bestMatchProject, currentUser]);

  const projectWithSuggestion = suggestion && suggestedProject
    ? { ...suggestedProject, tagline: suggestion.matchingOpportunities?.[0] || suggestedProject.tagline }
    : suggestedProject;

  const suggestionText = suggestion?.suggestedNextSteps?.[0];

  return (
    <Card className="bg-gradient-to-br from-primary/20 to-background">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="h-6 w-6 text-primary" />
          Suggested for you
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && projectWithSuggestion && (
            <ProjectCard
                project={projectWithSuggestion}
                currentUser={currentUser}
                allProjectPathLinks={allProjectPathLinks}
                allLearningPaths={allLearningPaths}
                suggestionText={suggestionText}
            />
        )}
        {!loading && !projectWithSuggestion && (
            <div className="text-center text-muted-foreground p-4">
                <p>No new project suggestions right now. Explore all projects below!</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
