
import type { User } from "@/lib/types";
import { getAllProjects, getAllUsers } from "@/lib/data.server";
import { getAuthenticatedUser } from "@/lib/session.server";
import ProjectCard from "@/components/project-card";
import { HydratedProject } from "@/lib/types";
import { toHydratedProject } from "@/lib/utils";

async function getHomePageData(): Promise<{
    projects: HydratedProject[];
}> {
    const [projectsData, usersData] = await Promise.all([
        getAllProjects(),
        getAllUsers(),
    ]);

    const usersMap = new Map(usersData.map((user) => [user.id, user]));

    const hydratedProjects = projectsData
        .filter((p) => p.status === 'published')
        .map((p) => toHydratedProject(p, usersMap));

    return { projects: hydratedProjects };
}

export default async function HomePage() {
    const { projects } = await getHomePageData();

    return (
        <div className="container mx-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                ))}
            </div>
        </div>
    );
}

