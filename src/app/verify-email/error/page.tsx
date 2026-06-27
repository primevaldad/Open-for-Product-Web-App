'use client';

import { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { resendVerificationEmail } from '@/app/actions/auth';

export default function VerifyEmailErrorPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = () => {
    startTransition(async () => {
      const res = await resendVerificationEmail();
      if (res.success) {
        toast({ title: 'Email Sent', description: 'Check your inbox for a new verification link.' });
        setCooldown(60);
      } else if (res.cooldownRemaining) {
        setCooldown(res.cooldownRemaining);
        toast({ title: 'Please wait', description: res.error || `Try again in ${res.cooldownRemaining}s.` });
      } else {
        toast({ title: 'Error', description: res.error || 'Something went wrong.', variant: 'destructive' });
      }
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FF6B6B] to-[#FFC857] text-gray-900">
      <div className="max-w-md rounded-xl bg-white p-8 shadow-lg text-center">
        <h1 className="mb-4 text-2xl font-bold text-[#FF6B6B]">
          ❌ Verification Failed
        </h1>
        <p className="mb-6 text-gray-700">
          This verification link is invalid, has expired, or was already used.
          You can request a new one below.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleResend}
            disabled={isPending || cooldown > 0}
            className="w-full bg-[#2E73FF] hover:bg-[#1a5bed] text-white"
          >
            {isPending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
          </Button>
          <Link
            href="/home"
            className="inline-block text-sm text-muted-foreground underline"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
