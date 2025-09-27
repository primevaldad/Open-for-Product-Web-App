
import { getAuthenticatedUser } from "@/lib/session.server";
import SettingsForm from "./settings-form";
import { updateUserSettings } from "@/app/actions/settings";
import { redirect } from "next/navigation";
import { getAllTags } from "@/lib/data.server";
import type { Tag } from "@/lib/types";

// Helper to serialize Firestore Timestamps
const toISOString = (timestamp: any): string | any => {
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString();
    }
    if (timestamp instanceof Date) {
      return timestamp.toISOString();
    }
    return timestamp;
};
  
const serializeTag = (tag: Tag): Tag => ({
    ...tag,
    createdAt: toISOString(tag.createdAt),
    updatedAt: toISOString(tag.updatedAt),
});

// The page is a Server Component responsible for fetching data.
export default async function SettingsPage() {
  const [currentUser, allTags] = await Promise.all([
    getAuthenticatedUser(),
    getAllTags()
  ]);

  if (!currentUser) {
    redirect("/login");
  }

  const serializedTags = allTags.map(serializeTag);

  // It passes the user data, tags, and the server action to the client component.
  return (
    <SettingsForm
      currentUser={currentUser}
      allTags={serializedTags}
      updateUserSettings={updateUserSettings}
    />
  );
}
