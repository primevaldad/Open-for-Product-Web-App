"use client";

import { summarizeProjectProgress } from "@/ai/flows/summarize-project-progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project } from "@/lib/types";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

interface SummarizeProgressProps {
  project: Project;
}

export function SummarizeProgress({ project }: SummarizeProgressProps) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      setSummary(null);
      const res = await summarizeProjectProgress({
        projectName: project.name,
        recentActivity: `The project is currently at ${project.progress}% completion. There are ${project.discussions} active discussion threads. Key recent activities include finalizing the initial design mockups and setting up the development environment.`
      });
      setSummary(res.summary);
    } catch (e) {
      setError("Could not generate summary at this time.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="text-primary" />
          AI Summary
        </CardTitle>
        <CardDescription>Get a quick overview of the project's current status.</CardDescription>
      </CardHeader>
      <CardContent>
        {summary && (
          <div className="prose prose-sm text-foreground max-w-none">
            <p>{summary}</p>
          </div>
        )}
        {loading && (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
        {!summary && !loading && (
          <Button onClick={getSummary} disabled={loading}>
            <FileText className="mr-2 h-4 w-4" />
            Summarize Progress
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
