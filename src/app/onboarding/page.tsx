
import OnboardingForm from "./onboarding-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateOnboardingInfo } from "../actions/settings";
import { getCurrentUser, findUserById } from "@/lib/data-cache";
import { redirect } from "next/navigation";

// This is now a Server Component that fetches data and passes it down.
export default async function OnboardingPage() {
  const currentUser = await getCurrentUser();

  // If the currently simulated user is already onboarded, redirect them away.
  if (currentUser?.onboarded) {
    redirect('/');
  }

  // Find the first user that has not been onboarded.
  // In our new setup, this will always be u3 until they are onboarded.
  const newUser = findUserById('u3');

  if (!newUser || newUser.onboarded) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Card>
                <CardHeader>
                    <CardTitle>All users are onboarded!</CardTitle>
                    <CardDescription>There are no new users to onboard.</CardDescription>
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
