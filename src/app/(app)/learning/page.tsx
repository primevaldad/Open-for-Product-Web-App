
import { getAllLearningPaths } from '@/lib/data.server';
import LearningPathCard from '@/components/learning-path-card';
import { deepSerialize } from '@/lib/utils';
import type { LearningPath } from '@/lib/types';

async function getLearningPathsData(): Promise<{ paths: LearningPath[] }> {
    const paths = await getAllLearningPaths();
    // Serialize the paths to ensure they are plain objects
    const serializedPaths = deepSerialize(paths);
    return { paths: serializedPaths };
}

export default async function LearningPathsPage() {
    const { paths } = await getLearningPathsData();

    return (
        <div className="container mx-auto p-4">
            <header className="text-center mb-8">
              <h1 className="text-4xl font-bold text-primary">Learning Paths</h1>
              <p className="text-lg text-muted-foreground mt-2">Follow these structured paths to master new skills and technologies.</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paths.map(path => (
                    <LearningPathCard key={path.pathId} path={path} />
                ))}
            </div>
        </div>
    );
}
