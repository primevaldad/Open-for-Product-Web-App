'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  Users,
  Sparkles,
  RotateCcw,
  Loader2,
  Trash2,
  AlertTriangle,
  Globe,
  ExternalLink,
} from 'lucide-react';
import type { HydratedProject, FeaturedProjectCard, User } from '@/lib/types';
import {
  getFeaturedProjectCardAction,
  saveFeaturedProjectCardAction,
  unfeatureProjectAction,
} from '@/app/actions/featured-projects';
import { useToast } from '@/hooks/use-toast';

interface FeatureProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: HydratedProject;
  currentUser: User | null;
  onSuccess: (card: FeaturedProjectCard | null, isFeatured: boolean) => void;
}

export default function FeatureProjectModal({
  isOpen,
  onClose,
  project,
  currentUser,
  onSuccess,
}: FeatureProjectModalProps) {
  const { toast } = useToast();

  // Project defaults
  const defaultCategory =
    project.tags?.find((t) => t.isCategory)?.display ||
    project.tags?.[0]?.display ||
    'Community';

  const defaultCollaborators =
    (Array.isArray(project.contributionNeeds) && project.contributionNeeds[0]) ||
    (Array.isArray(project.team) && project.team.length > 0
      ? `${project.team.length} contributor${project.team.length === 1 ? '' : 's'}`
      : 'Early contributors welcome');

  // Form states
  const [title, setTitle] = useState(project.name || '');
  const [tagline, setTagline] = useState(project.tagline || project.description || '');
  const [category, setCategory] = useState(defaultCategory);
  const [collaborators, setCollaborators] = useState(defaultCollaborators);
  const [photoUrl, setPhotoUrl] = useState(project.photoUrl || '');
  const [visual, setVisual] = useState<string | null>(null);

  // Status & loading states
  const [isLoadingCard, setIsLoadingCard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUnfeaturing, setIsUnfeaturing] = useState(false);
  const [existingCard, setExistingCard] = useState<FeaturedProjectCard | null>(null);

  const isFeatured = !!project.featured;
  const parseDateToMillis = (val: any): number => {
    if (!val) return 0;
    if (typeof val === 'string' || typeof val === 'number') {
      const t = new Date(val).getTime();
      return isNaN(t) ? 0 : t;
    }
    if (typeof val.toDate === 'function') return val.toDate().getTime();
    if (val instanceof Date) return val.getTime();
    return 0;
  };

  const projectUpdatedAt = parseDateToMillis(project.updatedAt);
  const featuredCardUpdatedAt = parseDateToMillis(project.featuredCardUpdatedAt);

  // Determine if project was edited after feature card was created/updated
  const wasEditedAfterFeature = Boolean(
    isFeatured &&
      (!project.featuredCardUpdatedAt || (projectUpdatedAt > 0 && projectUpdatedAt > featuredCardUpdatedAt))
  );

  // Load existing feature card when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingCard(true);

    getFeaturedProjectCardAction(project.id)
      .then((res) => {
        if (!isMounted) return;
        if (res.success && res.data) {
          const card = res.data;
          setExistingCard(card);
          setTitle(card.title || project.name);
          setTagline(card.tagline || project.tagline || project.description || '');
          setCategory(card.category || defaultCategory);
          setCollaborators(card.collaborators || defaultCollaborators);
          setPhotoUrl(card.photoUrl !== null && card.photoUrl !== undefined ? card.photoUrl : (project.photoUrl || ''));
          setVisual(card.visual || null);
        } else {
          // Pre-load from project values
          setExistingCard(null);
          setTitle(project.name);
          setTagline(project.tagline || project.description || '');
          setCategory(defaultCategory);
          setCollaborators(defaultCollaborators);
          setPhotoUrl(project.photoUrl || '');
          setVisual(null);
        }
      })
      .catch((err) => {
        console.error('Failed to load featured card:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingCard(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, project.id, project.name, project.tagline, project.description, project.photoUrl, defaultCategory, defaultCollaborators]);

  // Reset to live project values
  const handleResetToProject = () => {
    setTitle(project.name);
    setTagline(project.tagline || project.description || '');
    setCategory(defaultCategory);
    setCollaborators(defaultCollaborators);
    setPhotoUrl(project.photoUrl || '');
    setVisual(null);
    toast({
      title: 'Reset to Project Defaults',
      description: 'Feature card fields updated to match current project details.',
    });
  };

  // Save / Publish
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || isUnfeaturing) return;

    if (!title.trim()) {
      toast({
        variant: 'destructive',
        title: 'Title Required',
        description: 'Please provide a title for the feature card.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await saveFeaturedProjectCardAction({
        projectId: project.id,
        title: title.trim(),
        tagline: tagline.trim(),
        description: tagline.trim(),
        category: category.trim(),
        collaborators: collaborators.trim(),
        photoUrl: photoUrl.trim() || null,
        visual: visual || null,
      });

      if (!res.success || !res.data) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: res.error || 'Failed to save feature card.',
        });
      } else {
        toast({
          title: isFeatured ? 'Feature Card Updated' : 'Project Featured!',
          description: `"${res.data.title}" is featured on openforproduct.com`,
        });
        onSuccess(res.data, true);
        onClose();
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred while saving.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Unfeature
  const handleUnfeature = async () => {
    if (isSaving || isUnfeaturing) return;
    setIsUnfeaturing(true);

    try {
      const res = await unfeatureProjectAction(project.id);
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: res.error || 'Failed to unfeature project.',
        });
      } else {
        toast({
          title: 'Project Unfeatured',
          description: `"${project.name}" has been removed from the marketing site.`,
        });
        onSuccess(null, false);
        onClose();
      }
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsUnfeaturing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden sm:rounded-2xl max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Star className="h-5 w-5 fill-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {wasEditedAfterFeature
                    ? 'Re-Feature Project on Marketing Site'
                    : isFeatured
                    ? 'Edit Feature Card'
                    : 'Feature Project on Marketing Site'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Configure how this project appears in the &quot;Happening now&quot; section on{' '}
                  <span className="font-medium text-foreground">openforproduct.com</span>
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Alert if project was edited after feature card */}
          {wasEditedAfterFeature && (
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold">Project content has changed!</span> The project was
                edited after this card was published. Review the pre-loaded fields and click
                &quot;Re-Publish Feature Card&quot; to push updates to the marketing site.
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetToProject}
                className="h-7 px-2 text-xs hover:bg-amber-500/20 text-amber-700 dark:text-amber-200"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Sync Project
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* Modal Body: Two-column layout (Preview + Form) */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingCard ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
              <p className="text-sm">Loading feature card data…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {/* Left Column: Live Marketing Card Preview */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium">
                    <Globe className="h-3.5 w-3.5 text-amber-600" />
                    Live Marketing Card Preview
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-muted/40 font-mono">
                    openforproduct.com
                  </Badge>
                </div>

                {/* 1:1 Marketing Site Card */}
                <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#dfd5c5] bg-[#fffaf2] shadow-[0_12px_36px_rgba(62,49,31,0.07)]">
                  {/* Photo Visual */}
                  <div className="relative h-44 overflow-hidden bg-[#2a2924]">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={title || 'Project photo'}
                        className="h-full w-full object-cover transition-transform duration-500"
                        onError={(e) => {
                          // Fallback if image fails to load
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#ebdccb] to-[#d8c3a9] text-[#786b58]">
                        <Sparkles className="h-8 w-8 opacity-40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Card Content */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-serif text-2xl leading-tight text-[#25251f]">
                      {title || <span className="opacity-40 italic">Untitled Project</span>}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-[#5c584d] line-clamp-3">
                      {tagline || (
                        <span className="opacity-40 italic">
                          A concise tagline or description for visitors...
                        </span>
                      )}
                    </p>

                    <div className="mt-auto pt-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <span className="inline-flex items-center gap-1 text-[#4f5f49]">
                          <Users className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {collaborators || 'Early contributors welcome'}
                          </span>
                        </span>
                        <span className="rounded-full bg-[#ebe1cb] px-3 py-1 font-medium text-[#6a5c3f] shrink-0">
                          {category || 'Community'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tip: Changes made here only affect how the project is presented in the marketing
                  showcase, without modifying the underlying project document.
                </p>
              </div>

              {/* Right Column: Editable Fields */}
              <form id="feature-card-form" onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Customize Display Content
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToProject}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="Reset all inputs back to original project values"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset Defaults
                  </Button>
                </div>

                {/* Display Title */}
                <div className="space-y-1.5">
                  <Label htmlFor="feature-title" className="text-xs font-medium">
                    Display Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="feature-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Open Book"
                    required
                    className="h-9 text-sm"
                  />
                </div>

                {/* Tagline / Hook */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="feature-tagline" className="text-xs font-medium">
                      Marketing Catchphrase / Tagline
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      {tagline.length}/140 chars recommended
                    </span>
                  </div>
                  <Textarea
                    id="feature-tagline"
                    rows={3}
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="A punchy hook that introduces the project to curious visitors..."
                    className="text-sm leading-relaxed resize-none"
                  />
                </div>

                {/* Category & Collaborators Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="feature-category" className="text-xs font-medium">
                      Category Tag
                    </Label>
                    <Input
                      id="feature-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., Publishing"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="feature-collab" className="text-xs font-medium">
                      Collaborators Hook
                    </Label>
                    <Input
                      id="feature-collab"
                      value={collaborators}
                      onChange={(e) => setCollaborators(e.target.value)}
                      placeholder="e.g., Writers welcome"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                {/* Photo URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="feature-photo" className="text-xs font-medium">
                      Card Cover Image URL
                    </Label>
                    {project.photoUrl && photoUrl !== project.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setPhotoUrl(project.photoUrl || '')}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Use Project Cover
                      </button>
                    )}
                  </div>
                  <Input
                    id="feature-photo"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://... (image URL)"
                    className="h-9 text-sm"
                  />
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t bg-card flex flex-row items-center justify-between sm:justify-between">
          <div>
            {isFeatured && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUnfeature}
                disabled={isSaving || isUnfeaturing || isLoadingCard}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 h-9"
              >
                {isUnfeaturing ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1.5" />
                )}
                Unfeature Project
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSaving || isUnfeaturing}
              className="h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="feature-card-form"
              size="sm"
              disabled={isSaving || isUnfeaturing || isLoadingCard}
              className="bg-amber-500 text-white hover:bg-amber-600 h-9 px-4 font-semibold shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : wasEditedAfterFeature ? (
                <>
                  <Star className="h-4 w-4 mr-1.5 fill-white" />
                  Re-Publish Feature Card
                </>
              ) : isFeatured ? (
                <>
                  <Star className="h-4 w-4 mr-1.5 fill-white" />
                  Update Feature Card
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-1.5 fill-white" />
                  Publish to Marketing Site
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
