
import OnboardingForm from "./onboarding-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@/lib/types";
import { updateOnboardingInfo } from "../actions/settings";
import { mockUsers } from "@/lib/mock-data";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/data-cache";

// This is now a Server Component that fetches data and passes it down.
export default async function OnboardingPage() {
  const currentUser = await getCurrentUser();

  // If there's no specific "new" user, check if the current user is already onboarded.
  // If so, redirect them away from the onboarding page.
  if (currentUser?.onboarded) {
    redirect('/');
  }

  // Find the first user that has not been onboarded.
  const newUser = mockUsers.find(u => !u.onboarded) || null;

  if (!newUser) {
    // This state should ideally not be reached if the check above works,
    // but it's good practice to handle it.
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Card>
                <CardHeader>
                    <CardTitle>All users are onboarded!</CardTitle>
                    <CardDescription>There are no new users to onboard in the mock data.</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <OnboardingForm newUser={newUser} updateOnboardingInfo={updateOnboardingInfo} />
    </div>
  );
}
