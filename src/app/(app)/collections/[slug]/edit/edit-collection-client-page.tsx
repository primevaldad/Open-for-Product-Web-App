'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Loader2, Trash2, Plus, X, Search, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { useAuth } from '@/components/auth-provider';
import { uploadProjectImage } from '@/app/actions/upload';
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

interface EditCollectionPageClientProps {
    slug: string;
}

export default function EditCollectionPageClient({ slug }: EditCollectionPageClientProps) {
    const router = useRouter();

    const [collection, setCollection] = useState<HydratedCollection | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState<ProjectCollection['visibility']>('public');
    const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(undefined);
    const [uploading, setUploading] = useState(false);

    const { currentUser, loading: authLoading } = useAuth();

    // Project search
    const [projectSearch, setProjectSearch] = useState('');

    useEffect(() => {
        if (authLoading || !currentUser) return;

        getCollectionBySlug(slug).then((result) => {
            if (result.success && result.data) {
                // Ownership check
                if (result.data.owner.id !== currentUser.id) {
                    toast.error('You do not have permission to edit this collection.');
                    router.push(`/collections/${slug}`);
                    return;
                }

                setCollection(result.data);
                setName(result.data.name);
                setDescription(result.data.description);
                setVisibility(result.data.visibility);
                setCoverImageUrl(result.data.coverImageUrl);
            } else {
                toast.error('Collection not found or access denied.');
                router.push('/collections');
            }
            setLoading(false);
        });
    }, [slug, router, currentUser]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'collections');

        const result = await uploadProjectImage(formData);
        if (result.success && result.url) {
            setCoverImageUrl(result.url);
            toast.success('Image uploaded!');
        } else {
            toast.error(result.error ?? 'Upload failed.');
        }
        setUploading(false);
    };

    const handleSave = async () => {
        if (!collection) return;
        setSaving(true);
        const result = await updateCollectionAction(collection.id, { 
            name, 
            description, 
            visibility,
            coverImageUrl 
        });
        setSaving(false);
        if (result.success) {
            toast.success('Collection updated.');
            setCollection(prev => prev ? { ...prev, name, description, visibility, coverImageUrl } : prev);
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

                {/* Cover Image */}
                <div className="space-y-4">
                    <Label>Cover Image</Label>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="relative h-32 w-full sm:w-56 overflow-hidden rounded-lg border bg-muted shrink-0">
                            {coverImageUrl ? (
                                <Image
                                    src={coverImageUrl}
                                    alt="Cover preview"
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                                </div>
                            )}
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                                Recommended size: 1200x400 (3:1 aspect ratio). Max 5MB.
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="relative"
                                    disabled={uploading}
                                >
                                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                                    {coverImageUrl ? 'Change Image' : 'Upload Image'}
                                    <input
                                        type="file"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </Button>
                                {coverImageUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => setCoverImageUrl(undefined)}
                                        disabled={uploading}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
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
