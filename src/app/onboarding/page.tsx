
import OnboardingForm from "./onboarding-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { User } from "@/lib/types";
import { updateOnboardingInfo } from "../actions/settings";
import { mockUsers } from "@/lib/mock-data";

// This is now a Server Component that fetches data and passes it down.
export default function OnboardingPage() {
  const newUser = mockUsers.find(u => !u.onboarded) || null;

  if (!newUser) {
    // In a real app, you might redirect to a dashboard if the user is already onboarded
    // For this prototype, we'll just show a message.
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
