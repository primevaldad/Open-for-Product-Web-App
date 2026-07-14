'use client';

import { useState, useEffect } from 'react';
import { QueenAction } from '@/lib/types';
import { getPendingQueenActionsAction, approveQueenAction, rejectQueenAction } from '@/app/actions/queen';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export function LeadDashboardTab({ projectId }: { projectId: string }) {
    const [actions, setActions] = useState<QueenAction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchActions = async () => {
        setIsLoading(true);
        const res = await getPendingQueenActionsAction(projectId);
        setIsLoading(false);
        if (res.success && res.data) {
            setActions(res.data);
        } else {
            toast({ title: 'Error', description: 'Failed to load Queen recommendations.', variant: 'destructive' });
        }
    };

    useEffect(() => {
        fetchActions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const handleApprove = async (actionId: string) => {
        setProcessingId(actionId);
        const res = await approveQueenAction(projectId, actionId);
        if (res.success) {
            toast({ title: 'Approved', description: 'Task has been created and added to the board.' });
            setActions(prev => prev.filter(a => a.id !== actionId));
        } else {
            toast({ title: 'Error', description: res.error || 'Failed to approve action.', variant: 'destructive' });
        }
        setProcessingId(null);
    };

    const handleReject = async (actionId: string) => {
        setProcessingId(actionId);
        const res = await rejectQueenAction(projectId, actionId);
        if (res.success) {
            toast({ title: 'Rejected', description: 'Recommendation dismissed.' });
            setActions(prev => prev.filter(a => a.id !== actionId));
        } else {
            toast({ title: 'Error', description: res.error || 'Failed to reject action.', variant: 'destructive' });
        }
        setProcessingId(null);
    };

    return (
        <div className="p-4 space-y-8 max-w-5xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-primary" />
                    Lead Dashboard
                </h2>
                <p className="text-muted-foreground mt-1">
                    Review AI-generated recommendations and daily project briefs.
                </p>
            </div>

            <div className="space-y-6">
                <h3 className="text-xl font-semibold border-b pb-2 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    Pending Approvals
                </h3>
                
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : actions.length === 0 ? (
                    <div className="p-8 text-center border rounded-xl bg-card/50 border-dashed">
                        <p className="text-muted-foreground">No pending recommendations from Queen right now.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {actions.map(action => (
                            <Card key={action.id} className="relative overflow-hidden group border-amber-500/20 shadow-sm transition-all hover:shadow-md">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg leading-tight text-foreground/90">
                                            {action.payload?.title || 'Untitled Action'}
                                        </CardTitle>
                                        <span className="text-xs px-2 py-1 bg-muted rounded-full uppercase tracking-wider font-semibold text-muted-foreground ml-2 shrink-0">
                                            {action.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <CardDescription className="pt-2 text-sm">
                                        {action.payload?.description || 'No description provided.'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pb-4 text-xs text-muted-foreground">
                                    Proposed: {new Date(action.proposedAt as string).toLocaleString()}
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2 bg-muted/30 pt-4">
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleReject(action.id)}
                                        disabled={processingId === action.id}
                                        className="hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                    >
                                        <XCircle className="w-4 h-4 mr-1.5" />
                                        Reject
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        onClick={() => handleApprove(action.id)}
                                        disabled={processingId === action.id}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                                    >
                                        {processingId === action.id ? (
                                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                        ) : (
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                        )}
                                        Approve Task
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-6 mt-12">
                <h3 className="text-xl font-semibold border-b pb-2">Jester's Daily Brief</h3>
                <div className="p-8 border rounded-xl bg-card text-center">
                    <p className="text-muted-foreground italic mb-2">Generating project context...</p>
                    <p className="text-sm">Jester will automatically summarize recent activity and team momentum here.</p>
                </div>
            </div>
        </div>
    );
}
