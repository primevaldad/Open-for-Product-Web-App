import { getHomePageData } from '@/app/actions/home';
import HomeClientPage from './home-client-page';
import { Skeleton } from '@/components/ui/skeleton';

// Revalidate the data every 5 minutes
export const revalidate = 300;

export default async function HomePage() {
  const response = await getHomePageData();

  if (!response.success) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Error: {response.message}</p>
      </div>
    );
  }

  const { success, ...pageData } = response;

  return (
    <HomeClientPage
      allPublishedProjects={pageData.allPublishedProjects}
      currentUser={pageData.currentUser}
      allTags={pageData.allTags}
      allLearningPaths={pageData.allLearningPaths}
      allProjectPathLinks={pageData.allProjectPathLinks}
      suggestedProjects={pageData.suggestedProjects}
      aiEnabled={pageData.aiEnabled}
    />
  );
}
