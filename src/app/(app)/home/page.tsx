
import { getHomePageData } from '@/app/actions/home';
import { HomePageDataResponse } from '@/lib/types';
import HomeClientPage from './home-client-page';

// Revalidate the data every 5 minutes
export const revalidate = 300;

export default async function HomePage() {
  // Explicitly type the response for clarity and safety.
  const data: HomePageDataResponse = await getHomePageData();

  // First, handle the error case by checking the `success` flag.
  if (!data.success) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Error: {data.error}</p>
      </div>
    );
  }

  // If successful, the data is safe to use.
  // We can pass the full data object to the client component.
  return <HomeClientPage {...data} />;
}
