
import { getAuthenticatedUser } from "@/lib/session.server";
import { CreateProjectForm } from "./create-project-form";
import { getAllTags } from "@/lib/data.server";
import { redirect } from 'next/navigation';
import type { Tag } from "@/lib/types";

// --- Serialization Helpers ---
const toISOString = (timestamp: unknown): string | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: unknown }).toDate === 'function'
  ) {
    return ((timestamp as { toDate: () => Date }).toDate()).toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return undefined;
};

const serializeTag = (tag: Tag): Tag => ({
  ...tag,
  createdAt: toISOString(tag.createdAt),
  updatedAt: toISOString(tag.updatedAt),
});

async function getCreatePageData() {
    const [currentUser, allTags] = await Promise.all([
        getAuthenticatedUser(),
        getAllTags()
    ]);
    const serializedTags = allTags.map(serializeTag);
    return { currentUser, allTags: serializedTags };
}

// The page is a Server Component responsible for fetching data and rendering the layout.
export default async function CreateProjectPage() {
    const { currentUser, allTags } = await getCreatePageData();

    if (!currentUser) {
        redirect('/login');
    }

    return (
        <CreateProjectForm 
            availableTags={allTags} 
        />
    );
}
