
import { getAuthenticatedUser } from "@/lib/session.server";
import SettingsForm from "./settings-form";
import { updateUserSettings } from "@/app/actions/settings";
import { redirect } from "next/navigation";
import { getAllTags } from "@/lib/data.server";
import type { Tag, User } from "@/lib/types";
import { NotAuthenticatedError } from "@/lib/errors";
import { serializeTimestamp } from "@/lib/utils"; // Import the centralized helper

const serializeTag = (tag: Tag): Tag => ({
    ...tag,
    createdAt: serializeTimestamp(tag.createdAt) ?? undefined,
    updatedAt: serializeTimestamp(tag.updatedAt) ?? undefined,
});

// The page is a Server Component responsible for fetching data.
export default async function SettingsPage() {
  try {
    const [rawCurrentUser, allTags] = await Promise.all([
        getAuthenticatedUser(),
        getAllTags()
    ]);

    const serializedTags = allTags.map(serializeTag);
    
    // Ensure currentUser is also serialized
    const currentUser: User = {
      ...rawCurrentUser,
      createdAt: serializeTimestamp(rawCurrentUser.createdAt) ?? undefined,
      lastLogin: serializeTimestamp(rawCurrentUser.lastLogin) ?? undefined,
    };

    // It passes the user data, tags, and the server action to the client component.
    return (
        <SettingsForm
            currentUser={currentUser}
            allTags={serializedTags}
            updateUserSettings={updateUserSettings}
        />
    );
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      redirect("/login");
    }
    // Re-throw other errors to be handled by Next.js error boundaries
    throw error;
  }
}
