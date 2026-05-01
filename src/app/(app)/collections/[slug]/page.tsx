import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Layers, Pencil, Lock, LinkIcon } from 'lucide-react';
import { getCollectionBySlug } from '@/app/actions/collections';
import { getAuthenticatedUser } from '@/lib/session.server';
import ProjectCard from '@/components/project-card';
import ShareButton from '@/components/share-button';
import { Button } from '@/components/ui/button';
import { getAllProjectPathLinks, getAllLearningPaths } from '@/lib/data.server';

export const dynamic = 'force-dynamic';

interface CollectionPageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CollectionPageProps) {
    const { slug } = await params;
    const result = await getCollectionBySlug(slug);
    if (!result.success || !result.data) {
        return { title: 'Collection Not Found' };
    }
    return {
        title: `${result.data.name} | Collections | Open for Product`,
        description: result.data.description,
    };
}

const visibilityLabel = {
    public: null,
    unlisted: { text: 'Unlisted', icon: LinkIcon },
    private: { text: 'Private', icon: Lock },
} as const;

export default async function CollectionPage({ params }: CollectionPageProps) {
    const { slug } = await params;

    const [result, currentUser, pathLinksResult, learningPathsResult] = await Promise.all([
        getCollectionBySlug(slug),
        getAuthenticatedUser(),
        getAllProjectPathLinks(),
        getAllLearningPaths(),
    ]);

    if (!result.success || !result.data) {
        notFound();
    }

    const collection = result.data;
    const isOwner = currentUser?.id === collection.owner.id;
    const badge = visibilityLabel[collection.visibility];

    return (
        <div className="container max-w-6xl py-8 space-y-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-2">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Layers className="w-4 h-4" />
                        <Link href="/collections" className="hover:text-foreground transition-colors">
                            Collections
                        </Link>
                        <span>/</span>
                        <span className="text-foreground font-medium">{collection.name}</span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-bold tracking-tight">{collection.name}</h1>
                        {badge && (
                            <span className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                <badge.icon className="w-3 h-3" />
                                {badge.text}
                            </span>
                        )}
                    </div>

                    {collection.description && (
                        <p className="text-muted-foreground max-w-prose">{collection.description}</p>
                    )}

                    <p className="text-sm text-muted-foreground">
                        Curated by{' '}
                        <Link
                            href={`/profile/${collection.owner.username ?? collection.owner.id}`}
                            className="font-medium text-foreground hover:underline"
                        >
                            {collection.owner.name}
                        </Link>
                        {' · '}
                        {collection.projects.length} project{collection.projects.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <ShareButton label="Share collection" />
                    {isOwner && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={`/collections/${slug}/edit`}>
                                <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                Edit
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Projects grid */}
            {collection.projects.length === 0 ? (
                <div className="text-center py-20 rounded-xl border-2 border-dashed bg-muted/20">
                    <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                    <h2 className="text-xl font-semibold">No projects yet</h2>
                    {isOwner && (
                        <p className="text-muted-foreground mt-2">
                            <Link href={`/collections/${slug}/edit`} className="underline underline-offset-2 hover:text-foreground">
                                Add your first project →
                            </Link>
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {collection.projects.map((project) => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            currentUser={currentUser}
                            allProjectPathLinks={pathLinksResult}
                            allLearningPaths={learningPathsResult.paths}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
