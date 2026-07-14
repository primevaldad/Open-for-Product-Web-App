'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { resendVerificationEmail } from '@/app/actions/auth';
import Link from 'next/link';

const COOLDOWN_SECONDS = 60;

interface VerifyEmailClientPageProps {
    email?: string;
    isVerified?: boolean;
    lastSentAt?: string | null; // ISO string from server
}

export default function VerifyEmailClientPage({ email, isVerified, lastSentAt }: VerifyEmailClientPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // Initialize cooldown from the server-side timestamp so it survives page reloads
    const [cooldown, setCooldown] = useState(() => {
        if (!lastSentAt) return 0;
        const elapsed = (Date.now() - new Date(lastSentAt).getTime()) / 1000;
        const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
        return remaining > 0 ? remaining : 0;
    });

    // Auto-redirect if already verified
    useEffect(() => {
        if (isVerified) {
            router.push('/projects');
        }
    }, [isVerified, router]);

    // Countdown timer
    useEffect(() => {
        if (cooldown > 0) {
            const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [cooldown]);

    const handleResend = () => {
        if (!email) return;
        startTransition(async () => {
            const res = await resendVerificationEmail();
            if (res.success) {
                toast({ title: 'Email Sent', description: 'Check your inbox for a new verification link.' });
                setCooldown(COOLDOWN_SECONDS);
            } else if (res.cooldownRemaining) {
                // Server says "too soon" — sync client cooldown to server's remaining time
                setCooldown(res.cooldownRemaining);
                toast({ title: 'Please wait', description: res.error || `Try again in ${res.cooldownRemaining}s.` });
            } else {
                toast({ title: 'Error', description: res.error || 'Failed to send email.', variant: 'destructive' });
            }
        });
    };

    return (
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                        <Mail className="h-8 w-8 text-[#2E73FF]" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
                    <CardDescription className="pt-2 text-base">
                        {cooldown > 0 ? (
                            <span>
                                We recently sent a verification link to <span className="font-medium text-[#1B1B1B]">{email}</span>.
                            </span>
                        ) : (
                            <span>
                                A verification email was sent to <span className="font-medium text-[#1B1B1B]">{email}</span>, but the request may have expired.
                            </span>
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        {cooldown > 0 
                            ? "Please check your inbox (and spam folder) for the verification link to unlock all features."
                            : "If you haven't received it or if the link expired, please click the button below to send a fresh verification email."}
                    </p>
                    <div className="flex flex-col gap-3">
                        <Button 
                            onClick={() => window.location.reload()} 
                            className="w-full bg-[#2E73FF] hover:bg-[#1a5bed]"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" /> I&apos;ve verified my email
                        </Button>
                        <Button 
                            variant="outline" 
                            onClick={handleResend} 
                            disabled={isPending || cooldown > 0 || !email}
                            className="w-full"
                        >
                            {isPending ? 'Sending...' : cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
                        </Button>
                    </div>
                    <div className="text-sm">
                        <Link href="/projects" className="text-muted-foreground underline">
                            Continue browsing as unverified user
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
