
import { getAuthenticatedUser } from '@/lib/session.server';
import { getDraftsPageData } from '@/app/actions/projects';
import DraftsClientPage from './drafts-client-page';
import { deepSerialize } from '@/lib/utils.server';

export default async function DraftsPage() {
    const user = await getAuthenticatedUser();
    
    const draftsResponse = await getDraftsPageData(user);

    // The 'in' operator provides a clear type guard for TypeScript, allowing it
    // to correctly narrow the discriminated union. If 'error' is a property
    // of the response, we are dealing with the error case.
    if ('error' in draftsResponse) {
        return <div>Error: {draftsResponse.error}</div>;
    }

    const { drafts, allLearningPaths, allProjectPathLinks } = draftsResponse;

    return (
        <DraftsClientPage
            drafts={deepSerialize(drafts)}
            allLearningPaths={deepSerialize(allLearningPaths)}
            allProjectPathLinks={deepSerialize(allProjectPathLinks)}
            currentUser={deepSerialize(user)}
        />
    );
}
