
import { notFound } from 'next/navigation';
import ProjectPageClient from './project-client-page';
import { getAuthenticatedUser } from '@/lib/session.server';
import { findProjectById, findUserById } from '@/lib/data.server';
import type { User, Project } from '@/lib/types';


async function getProjectPageData(projectId: string) {
    const currentUser = await getAuthenticatedUser();
    const project = await findProjectById(projectId);

    if (!project) return { project: null, currentUser };

    const teamWithUsers = await Promise.all(
        project.team.map(async (member) => {
            const user = await findUserById(member.userId);
            return { ...member, user: user as User };
        })
    );

    const discussionsWithUsers = await Promise.all(
        project.discussions.map(async (discussion) => {
            const user = await findUserById(discussion.userId);
            return { ...discussion, user: user as User, id: discussion.id || crypto.randomUUID() };
        })
    );

    const hydratedProject = {
        ...project,
        team: teamWithUsers,
        discussions: discussionsWithUsers,
    };

    return { project: hydratedProject, currentUser };
}


export default async function ProjectPage({ params }: { params: { id: string } }) {

    const { project, currentUser } = await getProjectPageData(params.id);

    if (!project || !currentUser) {
        notFound();
    }

    return (
        <ProjectPageClient
            project={project}
            currentUser={currentUser}
        />
    );
}
