
import { getAuthenticatedUser } from "@/lib/session.server";
import SettingsForm from "./settings-form";
import { updateUserSettings } from "../actions/settings";
import { redirect } from "next/navigation";

// The page is a Server Component responsible for fetching data.
export default async function SettingsPage() {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    redirect("/login");
  }

  // It passes the user data and the server action to the client component.
  return (
    <SettingsForm
      currentUser={currentUser}
      updateUserSettings={updateUserSettings}
    />
  );
}
