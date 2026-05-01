'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Loader2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { createCollectionAction } from '@/app/actions/collections';
import type { ProjectCollection } from '@/lib/types';

export default function NewCollectionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState<ProjectCollection['visibility']>('public');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Please enter a collection name.');
            return;
        }
        setLoading(true);
        try {
            const result = await createCollectionAction({ name, description, visibility });
            if (result.success && result.data) {
                toast.success('Collection created!');
                router.push(`/collections/${result.data.slug}`);
            } else {
                toast.error(result.error ?? 'Failed to create collection.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container max-w-2xl py-12">
            <div className="flex items-center gap-3 mb-8">
                <Layers className="w-6 h-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">New Collection</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="collection-name">Name *</Label>
                    <Input
                        id="collection-name"
                        placeholder="e.g. Open for Product Family"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={loading}
                        required
                    />
                    <p className="text-xs text-muted-foreground">
                        A URL-friendly slug will be generated automatically.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="collection-description">Description</Label>
                    <Textarea
                        id="collection-description"
                        placeholder="Describe what these projects have in common…"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="collection-visibility">Visibility</Label>
                    <Select
                        value={visibility}
                        onValueChange={(v) => setVisibility(v as ProjectCollection['visibility'])}
                        disabled={loading}
                    >
                        <SelectTrigger id="collection-visibility">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="public">
                                Public — listed in the Collections browse page
                            </SelectItem>
                            <SelectItem value="unlisted">
                                Unlisted — accessible via link only
                            </SelectItem>
                            <SelectItem value="private">
                                Private — only visible to you
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={loading || !name.trim()}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create Collection
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.back()}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}
