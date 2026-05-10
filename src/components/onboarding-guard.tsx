'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { User } from '@/lib/types';

interface OnboardingGuardProps {
    user: User | null;
    memberProjectIds?: string[];
    children: React.ReactNode;
}

export function OnboardingGuard({ user, memberProjectIds = [], children }: OnboardingGuardProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!user) return;

        // Skip check for guest users
        if (user.role === 'guest') return;

        // Skip check if already completed
        if (user.onboardingCompleted) return;

        const isProjectRoute = pathname.startsWith('/projects/') && pathname.split('/').length >= 3;
        const projectIdFromUrl = isProjectRoute ? pathname.split('/')[2] : null;
        const hasInviteToken = !!searchParams.get('inviteToken');

        // Define exempt routes that SHOULD NOT trigger a redirect to /onboarding
        let isExempt = pathname.startsWith('/onboarding') || pathname.startsWith('/api/');

        // If visiting a project, allow bypass ONLY IF they are a member OR have an invite token
        if (isProjectRoute && projectIdFromUrl) {
            if (hasInviteToken || memberProjectIds.includes(projectIdFromUrl)) {
                isExempt = true;
            }
        }

        if (!isExempt) {
            router.push('/onboarding');
        }
    }, [user, pathname, router, memberProjectIds, searchParams]);

    return <>{children}</>;
}
