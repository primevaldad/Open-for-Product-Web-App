
import { redirect } from 'next/navigation';
import { getHydratedData } from '@/lib/data-cache';

// This is a Server Component that just redirects to the current user's profile page.
export default async function ProfilePage() {
  const { currentUser } = await getHydratedData();
  
  if (!currentUser) {
    // Or handle loading/error state appropriately
    return null;
  }

  redirect(`/profile/${currentUser.id}`);
}
