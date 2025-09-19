
"use client";

import { suggestNextSteps } from "@/ai/flows/suggest-next-steps";
import ProjectCard from "@/components/project-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LearningPath, Project, ProjectPathLink } from "@/lib/types";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

type Suggestion = {
  suggestedNextSteps: string[];
  matchingOpportunities: string[];
};

interface SuggestStepsProps {
    suggestedProject: Project;
    allProjectPathLinks: ProjectPathLink[];
    allLearningPaths: LearningPath[];
}

export function SuggestSteps({ suggestedProject, allProjectPathLinks, allLearningPaths }: SuggestStepsProps) {
  const [loading, setLoading] = useState(true);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getSuggestions() {
      try {
        setLoading(true);
        setError(null);
        const res = await suggestNextSteps({
          userSkills: ["UI/UX Design", "Frontend Development", "Community"],
          projectNeeds: "We need help with designing new features and engaging the community.",
          userInterests: "Interested in social impact projects and creative tools.",
          projectProgress: "Project is in early stages, focusing on core feature development.",
        });
        setSuggestion(res);
      } catch (e) {
        console.error("AI suggestion failed:", e);
        // Fallback logic as planned
        if (suggestedProject.fallbackSuggestion) {
            setSuggestion({
                suggestedNextSteps: [suggestedProject.fallbackSuggestion],
                matchingOpportunities: [suggestedProject.tagline],
            });
        } else {
            setError("Could not load suggestions at this time.");
        }
      } finally {
        setLoading(false);
      }
    }
    getSuggestions();
  }, [suggestedProject]); // Add suggestedProject to dependency array

  // Use the tagline from the AI suggestion if available, otherwise use the project's original tagline.
  const projectWithSuggestion = suggestion
    ? { ...suggestedProject, tagline: suggestion.matchingOpportunities[0] || suggestedProject.tagline }
    : suggestedProject;

  // Determine the suggestion text, prioritizing the dynamic one, then the fallback.
  const suggestionText = suggestion?.suggestedNextSteps[0];

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
        {error && !loading && <p className="text-destructive text-center py-4">{error}</p>}
        {!loading && !error && suggestedProject && (
            <ProjectCard
                project={projectWithSuggestion}
                allProjectPathLinks={allProjectPathLinks}
                allLearningPaths={allLearningPaths}
                suggestionText={suggestionText}
            />
        )}
      </CardContent>
    </Card>
  );
}
