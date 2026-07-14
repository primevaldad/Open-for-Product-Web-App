'use client';

import { HydratedProject, LearningPath, ProjectPathLink, User } from '@/lib/types';
import ProjectCard from "@/components/project-card";

interface DraftsClientPageProps {
    drafts: HydratedProject[];
    allLearningPaths: LearningPath[];
    allProjectPathLinks: ProjectPathLink[];
    currentUser: User | null;
}

export default function DraftsClientPage({ 
    drafts, 
    allLearningPaths, 
    allProjectPathLinks, 
    currentUser 
}: DraftsClientPageProps) {
    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">My Drafts</h1>
            {drafts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drafts.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            currentUser={currentUser}
                            allLearningPaths={allLearningPaths}
                            allProjectPathLinks={allProjectPathLinks}
                        />
                    ))}
                </div>
            ) : (
                <p>You have no drafts.</p>
            )}
        </div>
    );
}
