
'use client';

import { useState } from "react";
import { Lightbulb } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { highlightProjectBlockers } from "@/ai/flows/highlight-project-blockers";
import type { Task, Discussion } from "@/lib/types";

interface HighlightBlockersProps {
  tasks: Task[];
  discussions: Discussion[];
}

export function HighlightBlockers({ tasks, discussions }: HighlightBlockersProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<any | null>(null);

  const getBlockers = async () => {
    try {
      setLoading(true);
      setError(null);
      setBlockers(null);

      // Convert tasks and discussions to a string format for the AI model
      const taskBoardActivity = tasks.map(t => `Task '${t.title}' is ${t.status}.`).join(' ');
      const projectDiscussions = discussions.map(d => d.content).join(' ');

      const res = await highlightProjectBlockers({
        projectDiscussions,
        taskBoardActivity,
      });
      setBlockers(res);
    } catch (e) {
      setError("Could not identify blockers at this time.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-400" />
          <span>AI-Powered Blockers</span>
        </CardTitle>
        <CardDescription>
          Let AI analyze project activity to identify potential blockers and risks before they impact your timeline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {blockers ? (
          <div className="space-y-4">
            {blockers.potentialBlockers.map((blocker: any, index: number) => (
              <div key={index} className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-semibold text-destructive">{blocker.title}</p>
                <p className="text-sm text-destructive-foreground/80">{blocker.description}</p>
                <p className="text-xs text-muted-foreground mt-2">Risk Level: {blocker.riskLevel}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-4">
            <p>Click the button to analyze the project and surface potential blockers.</p>
          </div>
        )}

        {error && (
            <p className="text-destructive text-sm mt-4 text-center">{error}</p>
        )}

        <div className="flex justify-center mt-6">
          <Button onClick={getBlockers} disabled={loading}>
            {loading ? 'Analyzing...' : 'Identify Blockers'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
