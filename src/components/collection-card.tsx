import Link from 'next/link';
import Image from 'next/image';
import { Layers, Lock, Link as LinkIcon, FolderOpen } from 'lucide-react';
import type { ProjectCollection } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { buildHybridUrl } from '@/lib/slug';

interface CollectionCardProps {
    collection: ProjectCollection & {
        ownerName?: string;
        ownerPhotoUrl?: string;
        isProjectCollection?: boolean;
        projectCount?: number;
    };
    ownerName?: string;
    className?: string;
}

const visibilityBadge = {
    public: null,
    unlisted: { label: 'Unlisted', icon: LinkIcon },
    private: { label: 'Private', icon: Lock },
} as const;

export default function CollectionCard({ collection, ownerName: propOwnerName, className }: CollectionCardProps) {
    const badge = visibilityBadge[collection.visibility];
    const projectCount = collection.projectCount ?? collection.memberProjectIds.length;
    const isProject = collection.isProjectCollection;
    const href = isProject 
        ? buildHybridUrl('/projects', collection.id, collection.name)
        : buildHybridUrl('/collections', collection.id, collection.name);
    const ownerName = collection.ownerName ?? propOwnerName;
    const initials = ownerName ? ownerName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

    return (
        <Link
            href={href}
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
                        {isProject ? (
                            <FolderOpen className="w-12 h-12 text-primary/30" />
                        ) : (
                            <Layers className="w-12 h-12 text-primary/30" />
                        )}
                    </div>
                )}

                {/* Visibility/Type badge */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                    {badge && (
                        <span className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm shadow-sm">
                            <badge.icon className="w-3 h-3" />
                            {badge.label}
                        </span>
                    )}
                    <span className="flex items-center gap-1 rounded-full bg-primary/95 text-primary-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm">
                        {isProject ? 'Project Container' : 'Collection'}
                    </span>
                </div>
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

                <div className="mt-auto flex items-center justify-between pt-2 border-t mt-4">
                    <span className="text-xs text-muted-foreground">
                        {projectCount} project{projectCount !== 1 ? 's' : ''}
                    </span>
                    {ownerName && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                            <Avatar className="w-4 h-4 shrink-0">
                                <AvatarImage src={collection.ownerPhotoUrl} />
                                <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[100px]" title={ownerName}>
                                {ownerName}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </Link>
    );
}
