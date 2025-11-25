
import { getAuthenticatedUser } from '@/lib/session.server';
import { getDraftsPageData } from '@/app/actions/projects';
import DraftsClientPage from './drafts-client-page';
import { deepSerialize } from '@/lib/utils.server';

export default async function DraftsPage() {
    const user = await getAuthenticatedUser();
    const draftsResponse = await getDraftsPageData();

    if (!draftsResponse.success) {
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
