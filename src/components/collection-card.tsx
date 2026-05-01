import Link from 'next/link';
import Image from 'next/image';
import { Layers, Lock, Link as LinkIcon } from 'lucide-react';
import type { ProjectCollection } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CollectionCardProps {
    collection: ProjectCollection;
    ownerName?: string;
    className?: string;
}

const visibilityBadge = {
    public: null,
    unlisted: { label: 'Unlisted', icon: LinkIcon },
    private: { label: 'Private', icon: Lock },
} as const;

export default function CollectionCard({ collection, ownerName, className }: CollectionCardProps) {
    const badge = visibilityBadge[collection.visibility];
    const projectCount = collection.memberProjectIds.length;

    return (
        <Link
            href={`/collections/${collection.slug}`}
            className={cn(
                'group flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm',
                'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
                className
            )}
        >
            {/* Cover image or gradient placeholder */}
            <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background">
                {collection.coverImageUrl ? (
                    <Image
                        src={collection.coverImageUrl}
                        alt={`${collection.name} cover`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <Layers className="w-12 h-12 text-primary/30" />
                    </div>
                )}

                {/* Visibility badge */}
                {badge && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                        <badge.icon className="w-3 h-3" />
                        {badge.label}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-2 p-4">
                <h3 className="font-semibold text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
                    {collection.name}
                </h3>

                {collection.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                        {collection.description}
                    </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                    <span>
                        {projectCount} project{projectCount !== 1 ? 's' : ''}
                    </span>
                    {ownerName && (
                        <span className="truncate max-w-[120px]">by {ownerName}</span>
                    )}
                </div>
            </div>
        </Link>
    );
}
