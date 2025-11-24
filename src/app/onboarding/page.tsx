import { OnboardingForm } from "./onboarding-form";
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
          user={currentUser} 
          allTags={allTags}
        />
    </div>
  );
}
