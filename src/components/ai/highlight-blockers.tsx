"use client";

import { highlightProjectBlockers } from "@/ai/flows/highlight-project-blockers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { useState } from "react";

type Blockers = {
  potentialBlockers: string[];
  dependencies: string[];
  summary: string;
};

export function HighlightBlockers() {
  const [loading, setLoading] = useState(false);
  const [blockers, setBlockers] = useState<Blockers | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getBlockers = async () => {
    try {
      setLoading(true);
      setError(null);
      setBlockers(null);
      const res = await highlightProjectBlockers({
        projectDiscussions: "Discussion ongoing about choice of state management library. Team is split between two options which might delay frontend work. Backend API for user profiles is not yet deployed.",
        taskBoardActivity: "Task 'Deploy User API' is blocked. Task 'Setup Redux' is on hold."
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
          <Sparkles className="text-primary" />
          AI Assistant
        </CardTitle>
        <CardDescription>Identify potential risks and dependencies for this project.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
             <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )}
        {error && <p className="text-destructive text-sm">{error}</p>}
        {blockers && (
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Potential Blockers</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {blockers.potentialBlockers.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                </div>
                 <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-2"><ShieldAlert className="h-4 w-4 text-red-500" />Dependencies</h3>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {blockers.dependencies.map((d, i) => <li key={i}>{d}</li>)}
                    </ul>
                </div>
            </div>
        )}
        {!blockers && !loading && (
          <div className="flex justify-center">
            <Button onClick={getBlockers} disabled={loading}>
              <AlertTriangle className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">Highlight <span className="hidden sm:inline">Blockers</span></span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
