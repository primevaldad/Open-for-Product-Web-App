
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/data-cache';

// This is a Server Component that just redirects to the current user's profile page.
export default async function ProfilePage() {
  // We can use getDashboardPageData as it conveniently fetches the currentUser
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    // Or handle loading/error state appropriately
    return null;
  }

  redirect(`/profile/${currentUser.id}`);
}
