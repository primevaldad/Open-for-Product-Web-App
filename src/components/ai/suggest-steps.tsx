
"use client";

import { suggestNextSteps } from "@/ai/flows/suggest-next-steps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Project } from "@/lib/types";

type Suggestion = {
  suggestedNextSteps: string[];
  matchingOpportunities: string[];
};

interface SuggestStepsProps {
    projects: Project[];
}

export function SuggestSteps({ projects }: SuggestStepsProps) {
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
        setError("Could not load suggestions at this time.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    getSuggestions();
  }, []);

  const suggestedProject = projects[1];

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
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && <p className="text-destructive">{error}</p>}
        {suggestion && suggestedProject && (
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-grow">
                <p className="font-semibold text-lg">{suggestedProject.name}</p>
                <p className="text-muted-foreground mb-2 line-clamp-2">
                    {suggestion.matchingOpportunities[0] || suggestedProject.tagline}
                </p>
                <p className="text-sm">
                    {suggestion.suggestedNextSteps[0] || 'Take a look at the project board to get started.'}
                </p>
            </div>
            <Link href={`/projects/${suggestedProject.id}`}>
                <Button variant="secondary" className="w-full md:w-auto">
                    View Project <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    