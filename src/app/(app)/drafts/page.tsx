
import type { User } from "@/lib/types";
import { getAllProjects, getAllUsers } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import ProjectCard from "@/components/project-card";
import { HydratedProject } from "@/lib/types";
import { toHydratedProject } from "@/lib/utils";

async function getDraftsPageData(currentUser: User): Promise<{
    drafts: HydratedProject[];
}> {
    const [projectsData, usersData] = await Promise.all([
        getAllProjects(),
        getAllUsers(),
    ]);

    const usersMap = new Map(usersData.map((user) => [user.id, user]));

    const hydratedDrafts = projectsData
        .filter(p => 
            p.status === 'draft' && 
            p.team.some(member => member.userId === currentUser.id && member.role === 'lead')
        )
        .map(p => toHydratedProject(p, usersMap));

    return { drafts: hydratedDrafts };
}

export default async function DraftsPage() {
    const currentUser = await getAuthenticatedUser();
    
    // Should not happen as route is protected, but good practice
    if (!currentUser) return <p>You must be logged in to view drafts.</p>;

    const { drafts } = await getDraftsPageData(currentUser);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">My Drafts</h1>
            {drafts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {drafts.map((draft) => (
                        <ProjectCard key={draft.id} project={draft} />
                    ))}
                </div>
            ) : (
                <p>You have no drafts.</p>
            )}
        </div>
    );
}
