'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Loader2, Check, ChevronsUpDown, X } from 'lucide-react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { createCollectionAction } from '@/app/actions/collections';
import { setProjectChildrenAction } from '@/app/actions/projects';
import type { ProjectCollection, HydratedProject } from '@/lib/types';
import { cn } from '@/lib/utils';

interface Props {
    userLeadProjects?: HydratedProject[];
    allProjects?: HydratedProject[];
}

export default function NewCollectionClientPage({ userLeadProjects = [], allProjects = [] }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    // Parent Selection State
    const [parentSearchOpen, setParentSearchOpen] = useState(false);
    const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
    const [name, setName] = useState('');
    
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] = useState<ProjectCollection['visibility']>('public');
    
    // Child Selection State
    const [childSearchOpen, setChildSearchOpen] = useState(false);
    const [selectedChildIds, setSelectedChildIds] = useState<Set<string>>(new Set());

    const isExistingProjectSelected = selectedParentId !== null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isExistingProjectSelected && !name.trim()) {
            toast.error('Please enter a collection name or select a parent project.');
            return;
        }

        setLoading(true);
        try {
            const childIdsArray = Array.from(selectedChildIds);

            if (isExistingProjectSelected) {
                // Nested Project Logic
                if (childIdsArray.length === 0) {
                     toast.error('Please select at least one project to add to the parent project.');
                     setLoading(false);
                     return;
                }
                const result = await setProjectChildrenAction(selectedParentId, childIdsArray);
                if (result.success) {
                    toast.success('Projects nested successfully!');
                    router.push(`/projects/${selectedParentId}`);
                } else {
                    toast.error(result.error ?? 'Failed to nest projects.');
                }
            } else {
                // Generic Collection Logic
                const result = await createCollectionAction({ 
                    name, 
                    description, 
                    visibility, 
                    memberProjectIds: childIdsArray 
                });
                if (result.success && result.data) {
                    toast.success('Collection created!');
                    router.push(`/collections/${result.data.slug}`);
                } else {
                    toast.error(result.error ?? 'Failed to create collection.');
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleChildProject = (id: string) => {
        setSelectedChildIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const removeChildProject = (id: string) => {
        setSelectedChildIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    return (
        <div className="container max-w-2xl py-12">
            <div className="flex items-center gap-3 mb-8">
                <Layers className="w-6 h-6 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">New Collection</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2 flex flex-col">
                    <Label>Name or Parent Project *</Label>
                    <Popover open={parentSearchOpen} onOpenChange={setParentSearchOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={parentSearchOpen}
                                className="w-full justify-between font-normal"
                            >
                                {isExistingProjectSelected
                                    ? userLeadProjects.find((project) => project.id === selectedParentId)?.name
                                    : name ? name : "Select project or type a new name..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                                <CommandInput 
                                    placeholder="Search projects or type new collection name..." 
                                    value={name} 
                                    onValueChange={(val) => {
                                        setName(val);
                                        setSelectedParentId(null);
                                    }}
                                />
                                <CommandList>
                                    <CommandEmpty className="p-0">
                                        {name ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                className="w-full text-left justify-start px-3 py-2 text-sm font-normal rounded-none h-auto hover:bg-accent hover:text-accent-foreground"
                                                onClick={() => {
                                                    setParentSearchOpen(false);
                                                }}
                                            >
                                                Create new collection &ldquo;{name}&rdquo;
                                            </Button>
                                        ) : (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                                No projects found.
                                            </div>
                                        )}
                                    </CommandEmpty>
                                    <CommandGroup heading="Your Projects">
                                        {userLeadProjects.map((project) => (
                                            <CommandItem
                                                key={project.id}
                                                value={project.name}
                                                onSelect={() => {
                                                    setSelectedParentId(project.id);
                                                    setName('');
                                                    setParentSearchOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedParentId === project.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {project.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground mt-1">
                        Select a project you lead to use it as a parent, or type a new name to create a generic collection.
                    </p>
                </div>

                {!isExistingProjectSelected && (
                    <>
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
                    </>
                )}

                <div className="space-y-2">
                    <Label>Include Projects</Label>
                    <Popover open={childSearchOpen} onOpenChange={setChildSearchOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={childSearchOpen}
                                className="w-full justify-between font-normal"
                            >
                                Select projects to include...
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                            <Command>
                                <CommandInput placeholder="Search projects..." />
                                <CommandList>
                                    <CommandEmpty>No projects found.</CommandEmpty>
                                    <CommandGroup>
                                        {allProjects.map((project) => (
                                            <CommandItem
                                                key={project.id}
                                                value={project.name}
                                                onSelect={() => toggleChildProject(project.id)}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedChildIds.has(project.id) ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                {project.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    {selectedChildIds.size > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {Array.from(selectedChildIds).map(id => {
                                const project = allProjects.find(p => p.id === id);
                                if (!project) return null;
                                return (
                                    <Badge key={id} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                                        <span className="truncate max-w-[200px]">{project.name}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => removeChildProject(id)}
                                            className="text-muted-foreground hover:text-foreground rounded-full hover:bg-muted p-0.5 ml-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <Button type="submit" disabled={loading || (!name.trim() && !isExistingProjectSelected)}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {isExistingProjectSelected ? 'Nest Projects' : 'Create Collection'}
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
