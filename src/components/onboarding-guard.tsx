'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { User } from '@/lib/types';

interface OnboardingGuardProps {
    user: User | null;
    children: React.ReactNode;
}

export function OnboardingGuard({ user, children }: OnboardingGuardProps) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        // Skip check for guest users
        if (user.role === 'guest') return;

        // Skip check if already completed or explicitly bypassed
        if (user.onboardingCompleted || user.bypassOnboarding) return;

        // Define exempt routes that SHOULD NOT trigger a redirect to /onboarding
        // We want users to be able to see projects they were invited to.
        const isExempt = 
            pathname.startsWith('/projects/') || 
            pathname.startsWith('/onboarding') ||
            pathname.startsWith('/api/');

        if (!isExempt) {
            router.push('/onboarding');
        }
    }, [user, pathname, router]);

    return <>{children}</>;
}
