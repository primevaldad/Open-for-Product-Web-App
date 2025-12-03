
import { getHomePageData } from '@/app/actions/home';
import { HomePageDataResponse } from '@/lib/types';
import HomeClientPage from './home-client-page';

// Revalidate the data every 5 minutes
export const revalidate = 300;

export default async function HomePage() {
  const data: HomePageDataResponse = await getHomePageData();

  // Use the 'in' operator for a robust type guard. This allows TypeScript
  // to correctly narrow the discriminated union and identify the error case.
  if ('error' in data) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-red-500">Error: {data.error}</p>
      </div>
    );
  }

  // If successful, the data is safe to use.
  return <HomeClientPage {...data} />;
}
