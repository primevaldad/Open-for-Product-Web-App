'use client';

import { useState, useEffect } from 'react';
import { getPaymentDiagnosticsAction } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function PaymentDiagnostics() {
    const [failures, setFailures] = useState<any[]>([]);
    const [stuck, setStuck] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const res = await getPaymentDiagnosticsAction(20);
        if (res.success) {
            setFailures(res.deliveryFailures || []);
            setStuck(res.stuckContributions || []);
        }
        setLoading(false);
    };

    const formatDate = (isoString: string) => new Date(isoString).toLocaleString();

    return (
        <div className="bg-card border rounded-xl p-6 space-y-6 shadow-sm">
            <h2 className="text-xl font-semibold border-b pb-2 flex items-center gap-2">
                <AlertCircle className="text-destructive h-5 w-5" /> 
                Payment Diagnostics
            </h2>
            
            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-8">
                    
                    {/* Delivery Failures */}
                    <div className="space-y-3">
                        <h3 className="font-medium">Webhook Delivery Failures</h3>
                        {failures.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No webhook failures recorded.</p>
                        ) : (
                            <div className="border rounded-md overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground text-xs uppercase">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Timestamp</th>
                                            <th className="px-4 py-3 font-medium">Reason</th>
                                            <th className="px-4 py-3 font-medium">Event Type</th>
                                            <th className="px-4 py-3 font-medium">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {failures.map(f => (
                                            <tr key={f.id} className="bg-card hover:bg-muted/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                                    {formatDate(f.timestamp)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="destructive" className="font-mono text-xs">
                                                        {f.reason}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                                    {f.eventType || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-xs">
                                                    {f.reason === 'no_matching_contribution' && (
                                                        <span>Ref: {f.referenceId}, Order: {f.squareOrderId}</span>
                                                    )}
                                                    {f.reason === 'pool_recalculation_failed' && (
                                                        <span>Project: {f.projectId}, Error: {f.error}</span>
                                                    )}
                                                    {(f.reason === 'invalid_signature' || f.reason === 'missing_signature') && (
                                                        <span>URL: {f.notificationUrl}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Stuck Contributions */}
                    <div className="space-y-3">
                        <h3 className="font-medium">Stuck/Failed Contributions</h3>
                        {stuck.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No stuck contributions found.</p>
                        ) : (
                            <div className="border rounded-md overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground text-xs uppercase">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Created At</th>
                                            <th className="px-4 py-3 font-medium">Status</th>
                                            <th className="px-4 py-3 font-medium">Contributor</th>
                                            <th className="px-4 py-3 font-medium">Amount</th>
                                            <th className="px-4 py-3 font-medium">Failure Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {stuck.map(c => (
                                            <tr key={c.id} className="bg-card hover:bg-muted/50">
                                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                                    {formatDate(c.createdAt)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant={c.status === 'failed' ? 'destructive' : 'secondary'} className="font-mono text-xs">
                                                        {c.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {c.contributorName}
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    ${c.amount}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate" title={c.checkoutFailureReason}>
                                                    {c.checkoutFailureReason || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button variant="outline" onClick={loadData}>
                            Refresh Diagnostics
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
