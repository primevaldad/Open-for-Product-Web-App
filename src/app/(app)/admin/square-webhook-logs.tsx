'use client';

import { useState, useEffect } from 'react';
import { getWebhookEventsAction } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SquareWebhookLogs() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        setLoading(true);
        const res = await getWebhookEventsAction(10);
        if (res.success && res.data) {
            setEvents(res.data);
            setHasMore(res.hasMore || false);
        }
        setLoading(false);
    };

    const loadMore = async () => {
        if (!events.length) return;
        setLoadingMore(true);
        const lastEvent = events[events.length - 1];
        const res = await getWebhookEventsAction(10, lastEvent.processedAt);
        if (res.success && res.data) {
            setEvents(prev => [...prev, ...res.data!]);
            setHasMore(res.hasMore || false);
        }
        setLoadingMore(false);
    };

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
            <h2 className="text-xl font-semibold border-b pb-2">Square Webhook Logs</h2>
            
            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center p-8">No webhook events recorded yet.</p>
            ) : (
                <div className="space-y-4">
                    <div className="border rounded-md overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted text-muted-foreground text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Processed At</th>
                                    <th className="px-4 py-3 font-medium">Event Type</th>
                                    <th className="px-4 py-3 font-medium">Event ID</th>
                                    <th className="px-4 py-3 font-medium">Square Order/Payment ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {events.map(event => (
                                    <tr key={event.id} className="bg-card hover:bg-muted/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                            {formatDate(event.processedAt)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className="font-mono text-xs">
                                                {event.eventType}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {event.id}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                            {event.squareOrderId || event.squarePaymentId || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {hasMore && (
                        <div className="flex justify-center pt-2">
                            <Button 
                                variant="outline" 
                                onClick={loadMore} 
                                disabled={loadingMore}
                            >
                                {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Load More
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
