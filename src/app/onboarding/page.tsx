
// Last updated: 2024-04-05T12:00:00Z
import OnboardingForm from "./onboarding-form";
import { updateOnboardingInfo } from "../actions/settings";
import { getAuthenticatedUser } from "@/lib/session.server";
import { redirect } from "next/navigation";
import { getAllTags } from "@/lib/data.server";
 import type { User } from '@/lib/types';

export default async function OnboardingPage() {
  const currentUser = await getAuthenticatedUser() as User;

  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser?.onboardingCompleted) {
    redirect('/home');
  }

  const allTags = await getAllTags();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <OnboardingForm 
          newUser={currentUser} 
          allTags={allTags}
          updateOnboardingInfo={updateOnboardingInfo} 
        />
    </div>
  );
}
