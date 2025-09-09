
import OnboardingForm from "./onboarding-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateOnboardingInfo } from "../actions/settings";
import { getAuthenticatedUser } from "@/lib/session.server"; // Corrected import
import { redirect } from "next/navigation";
import type { User } from '@/lib/types';


// This is now a Server Component that fetches data and passes it down.
export default async function OnboardingPage() {
  const currentUser = await getAuthenticatedUser() as User; // Corrected function call

  if (!currentUser) {
    redirect('/login');
  }

  // If the currently simulated user is already onboarded, redirect them away.
  if (currentUser?.onboarded) {
    redirect('/home');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <OnboardingForm newUser={currentUser} updateOnboardingInfo={updateOnboardingInfo} />
    </div>
  );
}
