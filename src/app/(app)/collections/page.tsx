import { Suspense } from 'react';
import { Loader2, Layers, Plus } from 'lucide-react';
import Link from 'next/link';
import { getPublicCollections, getMyCollections } from '@/app/actions/collections';
import { getAuthenticatedUser } from '@/lib/session.server';
import CollectionCard from '@/components/collection-card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Collections | Open for Product',
    description: 'Browse curated collections of open collaborative projects.',
};

export default async function CollectionsPage() {
    const [collectionsResult, myCollectionsResult, currentUser] = await Promise.all([
        getPublicCollections(),
        getMyCollections(),
        getAuthenticatedUser(),
    ]);
    
    const publicCollections = collectionsResult.success ? collectionsResult.data ?? [] : [];
    const myCollections = myCollectionsResult.success ? myCollectionsResult.data ?? [] : [];
    
    // Filter out duplicates (my public collections that are already in publicCollections)
    const otherPublicCollections = publicCollections.filter(pc => 
        !myCollections.some(mc => mc.id === pc.id)
    );

    const isGuest = !currentUser || currentUser.role === 'guest';

    return (
        <div className="container max-w-6xl py-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Layers className="w-6 h-6 text-primary" />
                        <h1 className="text-3xl font-bold tracking-tight">Collections</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Curated groups of related projects — families, themes, and ecosystems.
                    </p>
                </div>
                {!isGuest && (
                    <Button asChild>
                        <Link href="/collections/new">
                            <Plus className="w-4 h-4 mr-1.5" />
                            New Collection
                        </Link>
                    </Button>
                )}
            </div>

            {/* Grid */}
            {myCollections.length === 0 && otherPublicCollections.length === 0 ? (
                <div className="text-center py-20 rounded-xl border-2 border-dashed bg-muted/20">
                    <Layers className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                    <h2 className="text-xl font-semibold">No collections yet</h2>
                    <p className="text-muted-foreground mt-2">
                        Be the first to curate a group of projects.
                    </p>
                    {!isGuest && (
                        <Button className="mt-6" asChild>
                            <Link href="/collections/new">Create a Collection</Link>
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-12">
                    {/* My Collections Section */}
                    {myCollections.length > 0 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <h2 className="text-xl font-semibold">My Collections</h2>
                                <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    {myCollections.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {myCollections.map((c) => (
                                    <CollectionCard key={c.id} collection={c} />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Explore / Public Collections Section */}
                    {otherPublicCollections.length > 0 && (
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 border-b pb-2">
                                <h2 className="text-xl font-semibold">Explore Collections</h2>
                            </div>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {otherPublicCollections.map((c) => (
                                    <CollectionCard key={c.id} collection={c} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
