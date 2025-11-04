
import { findLearningPathsByIds } from '@/lib/data.server';
import ModuleAccordion from '@/components/module-accordion';
import { deepSerialize } from '@/lib/utils.server';
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
        return (
            <div className="container mx-auto p-4 text-center">
                <h1 className="text-2xl font-bold">Learning path not found.</h1>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4">
            <header className="bg-card p-6 rounded-lg shadow-md mb-8">
                <h1 className="text-4xl font-bold text-primary mb-2">{path.title}</h1>
                <p className="text-lg text-muted-foreground">{path.description}</p>
            </header>

            <div className="space-y-4">
                <h2 className="text-2xl font-semibold mb-4">Modules</h2>
                {path.modules.map((module, index) => (
                    <ModuleAccordion key={module.moduleId} module={{...module, order: index + 1}} />
                ))}
            </div>
        </div>
    );
}
