import { Suspense } from 'react';
import AuthActionClient from './auth-action-client';

export const metadata = {
  title: 'Authentication Action | Open for Product',
  description: 'Handle authentication actions like password reset and email verification.',
};

export default function AuthActionPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Suspense fallback={<div className="text-center">Loading...</div>}>
        <AuthActionClient />
      </Suspense>
    </div>
  );
}
