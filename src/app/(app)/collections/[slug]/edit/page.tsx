'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Loader2, Trash2, Plus, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
    getCollectionBySlug,
    updateCollectionAction,
    addProjectToCollectionAction,
    removeProjectFromCollectionAction,
    deleteCollectionAction,
} from '@/app/actions/collections';
import type { HydratedCollection, HydratedProject, ProjectCollection } from '@/lib/types';

interface EditCollectionPageProps {
    params: { slug: string };
}

export default function EditCollectionPage({ params }: EditCollectionPageProps) {
    const router = useRouter();
    const { slug } = params;

    const [collection, setCollection] = useState<HydratedCollection | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState<ProjectCollection['visibility']>('public');

    // Project search
    const [projectSearch, setProjectSearch] = useState('');

    useEffect(() => {
        getCollectionBySlug(slug).then((result) => {
            if (result.success && result.data) {
                setCollection(result.data);
                setName(result.data.name);
                setDescription(result.data.description);
                setVisibility(result.data.visibility);
            } else {
                toast.error('Collection not found or access denied.');
                router.push('/collections');
            }
            setLoading(false);
        });
    }, [slug, router]);

    const handleSave = async () => {
        if (!collection) return;
        setSaving(true);
        const result = await updateCollectionAction(collection.id, { name, description, visibility });
        setSaving(false);
        if (result.success) {
            toast.success('Collection updated.');
            setCollection(prev => prev ? { ...prev, name, description, visibility } : prev);
        } else {
            toast.error(result.error ?? 'Failed to save.');
        }
    };

    const handleRemoveProject = async (projectId: string) => {
        if (!collection) return;
        const result = await removeProjectFromCollectionAction(collection.id, projectId);
        if (result.success) {
            setCollection(prev =>
                prev
                    ? {
                          ...prev,
                          projects: prev.projects.filter(p => p.id !== projectId),
                          memberProjectIds: prev.memberProjectIds.filter(id => id !== projectId),
                      }
                    : prev
            );
            toast.success('Project removed from collection.');
        } else {
            toast.error(result.error ?? 'Failed to remove project.');
        }
    };

    const handleDelete = async () => {
        if (!collection) return;
        if (!confirm(`Delete "${collection.name}"? This cannot be undone.`)) return;
        const result = await deleteCollectionAction(collection.id);
        if (result.success) {
            toast.success('Collection deleted.');
            router.push('/collections');
        } else {
            toast.error(result.error ?? 'Failed to delete collection.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!collection) return null;

    const filteredProjects = collection.projects.filter(p =>
        p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
        p.tagline?.toLowerCase().includes(projectSearch.toLowerCase())
    );

    return (
        <div className="container max-w-3xl py-12 space-y-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Layers className="w-6 h-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Edit Collection</h1>
            </div>

            {/* Details form */}
            <section className="space-y-6">
                <h2 className="text-lg font-semibold">Details</h2>

                <div className="space-y-2">
                    <Label htmlFor="edit-name">Name</Label>
                    <Input
                        id="edit-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={saving}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                        id="edit-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        disabled={saving}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="edit-visibility">Visibility</Label>
                    <Select
                        value={visibility}
                        onValueChange={(v) => setVisibility(v as ProjectCollection['visibility'])}
                        disabled={saving}
                    >
                        <SelectTrigger id="edit-visibility">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="unlisted">Unlisted (link only)</SelectItem>
                            <SelectItem value="private">Private (only me)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-3">
                    <Button onClick={handleSave} disabled={saving || !name.trim()}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                    <Button variant="ghost" onClick={() => router.push(`/collections/${slug}`)}>
                        View Collection
                    </Button>
                </div>
            </section>

            <Separator />

            {/* Member projects */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">
                        Projects{' '}
                        <span className="text-muted-foreground font-normal text-sm">
                            ({collection.memberProjectIds.length})
                        </span>
                    </h2>
                </div>

                {collection.projects.length > 0 && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter projects…"
                            className="pl-9"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                        />
                    </div>
                )}

                {filteredProjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                        {collection.projects.length === 0
                            ? 'No projects in this collection yet. Add projects from any project page.'
                            : 'No projects match your search.'}
                    </p>
                ) : (
                    <ul className="divide-y rounded-lg border overflow-hidden">
                        {filteredProjects.map((project) => (
                            <li key={project.id} className="flex items-center gap-3 p-3 bg-card hover:bg-muted/40 transition-colors">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{project.name}</p>
                                    {project.tagline && (
                                        <p className="text-xs text-muted-foreground truncate">{project.tagline}</p>
                                    )}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemoveProject(project.id)}
                                    title={`Remove ${project.name} from collection`}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}

                <p className="text-xs text-muted-foreground">
                    To add a project, visit the project page and use the &ldquo;Add to Collection&rdquo; option there.
                </p>
            </section>

            <Separator />

            {/* Danger zone */}
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
                <div className="rounded-lg border border-destructive/30 p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <p className="font-medium text-sm">Delete this collection</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            This permanently deletes the collection. Projects are not affected.
                        </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleDelete}>
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        Delete Collection
                    </Button>
                </div>
            </section>
        </div>
    );
}
