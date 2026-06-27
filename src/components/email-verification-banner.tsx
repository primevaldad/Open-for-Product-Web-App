'use client';

import { AlertTriangle, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function EmailVerificationBanner({ isVerified, email }: { isVerified?: boolean; email?: string }) {
    if (isVerified || !email) {
        return null;
    }

    return (
        <div className="bg-[#FFC857] text-[#1B1B1B] px-4 py-2 text-sm flex items-center justify-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[#1B1B1B]" />
            <span>
                <span className="font-semibold">Please verify your email address.</span> 
                {' '}You will not be able to create projects or post comments until your email is verified.
            </span>
            <Link 
                href="/verify-email" 
                className="ml-2 font-medium underline underline-offset-2 flex items-center hover:opacity-80"
            >
                Verify Now <ChevronRight className="h-3 w-3 ml-0.5" />
            </Link>
        </div>
    );
}
