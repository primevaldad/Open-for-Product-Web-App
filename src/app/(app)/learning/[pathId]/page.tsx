
import { findLearningPathsByIds } from '@/lib/data.server';
import ModuleAccordion from '@/components/module-accordion';
import { deepSerialize } from '@/lib/utils';
import type { LearningPath } from '@/lib/types';

// This is a server component
async function getLearningPathDetails(pathId: string): Promise<{ path: LearningPath | null }> {
    const paths = await findLearningPathsByIds([pathId]);
    if (paths.length === 0) {
        return { path: null };
    }
    const serializedPath = deepSerialize(paths[0]);
    return { path: serializedPath };
}

export default async function LearningPathPage({ params }: { params: { pathId: string } }) {
    const { path } = await getLearningPathDetails(params.pathId);

    if (!path) {
        return <div>Learning path not found.</div>;
    }

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-4xl font-bold mb-4">{path.title}</h1>
            <p className="text-lg text-gray-600 mb-6">{path.description}</p>
            {path.modules.map(module => (
                <ModuleAccordion key={module.moduleId} module={module} />
            ))}
        </div>
    );
}
