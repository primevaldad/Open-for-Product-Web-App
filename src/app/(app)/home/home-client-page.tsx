
'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { User, GlobalTag, ProjectTag, ProjectPathLink, LearningPath, HydratedProject } from "@/lib/types";
import TagSelector from "@/components/tags/tag-selector";
import ShareButton from "@/components/share-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import ProjectCard from "@/components/project-card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Sparkles, Search, Loader2, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { searchProjectsSemantic } from "@/app/actions/search";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HomeClientPageProps {
    allPublishedProjects: HydratedProject[];
    currentUser: User | null;
    allTags: GlobalTag[];
    allProjectPathLinks: ProjectPathLink[];
    allLearningPaths: LearningPath[];
    suggestedProjects: HydratedProject[] | null;
    aiEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const projectTagFactory = (tag: { id: string; display: string }): ProjectTag => ({
  id: tag.id,
  display: tag.display,
  isCategory: false,
});

const sortProjects = (projects: HydratedProject[], criteria: string) => {
    return [...projects].sort((a, b) => {
        try {
            switch (criteria) {
                case 'popular':
                    return (b.team?.length || 0) - (a.team?.length || 0);
                case 'alphabetical':
                    return (a.name || '').localeCompare(b.name || '');
                case 'alphabetical-desc':
                    return (b.name || '').localeCompare(a.name || '');
                case 'trending': {
                    const dateA = a.updatedAt ? new Date(a.updatedAt as string).getTime() : 0;
                    const dateB = b.updatedAt ? new Date(b.updatedAt as string).getTime() : 0;
                    return dateB - dateA;
                }
                case 'latest':
                default: {
                    const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
                    return dateB - dateA;
                }
            }
        } catch (e) {
            console.error("Sort error for projects:", a.id, b.id, e);
            return 0;
        }
    });
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const ProjectList = ({
    projects,
    currentUser,
    allProjectPathLinks,
    allLearningPaths,
}: {
    projects: HydratedProject[];
    currentUser: User | null;
    allProjectPathLinks: ProjectPathLink[];
    allLearningPaths: LearningPath[];
}) => {
    if (!projects || projects.length === 0) return null;
    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <ProjectCard
                    key={project.id}
                    project={project}
                    currentUser={currentUser}
                    allProjectPathLinks={allProjectPathLinks}
                    allLearningPaths={allLearningPaths}
                />
            ))}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main inner component (uses useSearchParams — must be inside Suspense)
// ---------------------------------------------------------------------------

function HomeClientPageInner({
    allPublishedProjects,
    currentUser,
    allTags,
    allProjectPathLinks,
    allLearningPaths,
    suggestedProjects,
    aiEnabled,
}: HomeClientPageProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const isGuest = !currentUser || currentUser.role === 'guest';

    // -------------------------------------------------------------------------
    // URL → filter state (read)
    // -------------------------------------------------------------------------

    /** The committed search query (from URL). Drives both keyword and semantic search. */
    const searchQuery = searchParams.get('q') ?? '';

    /**
     * Resolve tag IDs from URL → ProjectTag[].
     * Unknown IDs (not present in allTags) are silently ignored.
     */
    const selectedTags = useMemo<ProjectTag[]>(() => {
        const ids = (searchParams.get('tags') ?? '').split(',').filter(Boolean);
        return ids
            .map(id => allTags.find(t => t.id === id))
            .filter((t): t is GlobalTag => !!t)
            .map(projectTagFactory);
    }, [searchParams, allTags]);

    const matchAllTags = searchParams.get('match') === 'all';
    const sortBy = searchParams.get('sort') ?? 'latest';
    const showMine = !isGuest && searchParams.get('mine') === 'true';
    const currentPage = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const [pageSize, setPageSize] = useState(10); // display preference — not shared in URL

    // -------------------------------------------------------------------------
    // Local UI state (not shareable)
    // -------------------------------------------------------------------------

    /** The live value of the text input — debounced before writing to URL. */
    const [inputValue, setInputValue] = useState(searchQuery);
    const [semanticResults, setSemanticResults] = useState<HydratedProject[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState<string[]>(['suggestions']);

    // Keep inputValue in sync if the URL changes externally (browser back/forward)
    useEffect(() => {
        setInputValue(searchParams.get('q') ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams.get('q')]);

    // -------------------------------------------------------------------------
    // URL → filter state (write)
    // -------------------------------------------------------------------------

    /**
     * Update one or more URL params atomically.
     * Pass `null` to delete a param.
     * Automatically resets `page` unless `page` is explicitly included in `updates`.
     */
    const updateParams = useCallback(
        (updates: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
            Object.entries(updates).forEach(([key, value]) => {
                if (value === null || value === '') {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            });
            // Reset to page 1 on any filter change unless caller explicitly sets page
            if (!('page' in updates)) {
                params.delete('page');
            }
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        },
        [searchParams, router, pathname]
    );

    // -------------------------------------------------------------------------
    // Debounce text input → URL
    // -------------------------------------------------------------------------

    useEffect(() => {
        const timer = setTimeout(() => {
            updateParams({ q: inputValue.trim() || null });
        }, 500);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputValue]);

    const clearSearch = useCallback(() => {
        setInputValue('');
        setSemanticResults(null);
        setSuggestionsOpen(['suggestions']);
        updateParams({ q: null });
    }, [updateParams]);

    // -------------------------------------------------------------------------
    // Semantic search (AI only) — driven by the committed URL param
    // -------------------------------------------------------------------------

    const handleSemanticSearch = useCallback(async (query: string) => {
        if (!aiEnabled || !query.trim()) return;
        setIsSearching(true);
        try {
            const response = await searchProjectsSemantic(query);
            if (response.success && response.data) {
                setSemanticResults(response.data);
                setSuggestionsOpen([]);
            } else {
                toast.error(response.error || 'Failed to perform semantic search');
            }
        } catch (error) {
            console.error('Search error:', error);
            toast.error('An unexpected error occurred during search');
        } finally {
            setIsSearching(false);
        }
    }, [aiEnabled]);

    useEffect(() => {
        if (aiEnabled && searchQuery) {
            handleSemanticSearch(searchQuery);
        } else {
            setSemanticResults(null);
            if (!searchQuery) setSuggestionsOpen(['suggestions']);
        }
    }, [searchQuery, aiEnabled, handleSemanticSearch]);

    // -------------------------------------------------------------------------
    // Filter pipeline
    // -------------------------------------------------------------------------

    const cleanAndUniqueProjects = useMemo(() => {
        const valid = (allPublishedProjects || []).filter(p => p && p.id);
        return Array.from(new Map(valid.map(p => [p.id, p])).values());
    }, [allPublishedProjects]);

    const cleanSuggestedProjects = useMemo(() => {
        const valid = (suggestedProjects || []).filter(p => p && typeof p === 'object' && p.id);
        return sortProjects(valid, sortBy);
    }, [suggestedProjects, sortBy]);

    const filteredAndSorted = useMemo(() => {
        let pool = cleanAndUniqueProjects;

        // 1. My Projects filter
        if (showMine && currentUser) {
            pool = pool.filter(p =>
                p.owner?.id === currentUser.id ||
                p.team.some(m => m.userId === currentUser.id)
            );
        }

        // 2. Keyword filter (client-side when AI is off, or as an additional pass when AI is on)
        //    When AI is on, `semanticResults` handles the search UI; we still apply keyword
        //    filter here so the "Browse Projects" section stays consistent.
        if (searchQuery.trim() && !aiEnabled) {
            const q = searchQuery.toLowerCase();
            pool = pool.filter(p =>
                p.name?.toLowerCase().includes(q) ||
                p.tagline?.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q)
            );
        }

        // 3. Tag filter
        if (selectedTags.length > 0) {
            pool = pool.filter(p => {
                const projectTagIds = new Set((p.tags || []).map(t => t.id));
                return matchAllTags
                    ? selectedTags.every(st => projectTagIds.has(st.id))
                    : selectedTags.some(st => projectTagIds.has(st.id));
            });
        }

        // 4. Sort
        return sortProjects(pool, sortBy);
    }, [cleanAndUniqueProjects, showMine, currentUser, searchQuery, aiEnabled, selectedTags, matchAllTags, sortBy]);

    const sortedSemanticResults = useMemo(() => {
        if (!semanticResults) return null;
        return sortProjects(semanticResults, sortBy);
    }, [semanticResults, sortBy]);

    const paginatedProjects = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAndSorted.slice(start, start + pageSize);
    }, [filteredAndSorted, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredAndSorted.length / pageSize);

    const shouldShowSuggestions = !isGuest && cleanSuggestedProjects.length > 0;

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    return (
        <>
            {/* ---------------------------------------------------------------- */}
            {/* Search & Filter Panel                                            */}
            {/* ---------------------------------------------------------------- */}
            <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold tracking-tight">Search &amp; Filter</h2>
                        {aiEnabled && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Powered
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Label htmlFor="sort-by" className="text-sm shrink-0 font-medium">Sort by:</Label>
                        <Select
                            value={sortBy}
                            onValueChange={(v) => updateParams({ sort: v === 'latest' ? null : v })}
                        >
                            <SelectTrigger id="sort-by" className="w-[160px] h-9 bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="latest">Latest</SelectItem>
                                <SelectItem value="popular">Most Popular</SelectItem>
                                <SelectItem value="trending">Recently Active</SelectItem>
                                <SelectItem value="alphabetical">A–Z</SelectItem>
                                <SelectItem value="alphabetical-desc">Z–A</SelectItem>
                            </SelectContent>
                        </Select>
                        <ShareButton label="Share view" />
                    </div>
                </div>

                {/* Search bar — always visible; AI search when enabled, keyword when not */}
                <div className="relative">
                    {aiEnabled ? (
                        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    ) : (
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    )}
                    <Input
                        id="project-search"
                        placeholder={
                            aiEnabled
                                ? "Search projects with AI (e.g. 'apps to help me save money')…"
                                : "Search projects by name, tagline, or description…"
                        }
                        className="pl-10 pr-10 py-6 text-lg"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && aiEnabled) {
                                // Immediate semantic search on Enter
                                updateParams({ q: inputValue.trim() || null });
                            } else if (e.key === 'Escape') {
                                clearSearch();
                            }
                        }}
                    />
                    {isSearching ? (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
                    ) : inputValue ? (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
                            aria-label="Clear search"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    ) : null}
                </div>

                <Separator />

                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    {/* Tag filter */}
                    <div className="flex-grow">
                        <Label htmlFor="tag-selector" className="mb-2 block font-medium">Filter by Tags</Label>
                        <TagSelector
                            id="tag-selector"
                            value={selectedTags}
                            onChange={(tags) =>
                                updateParams({
                                    tags: tags.length > 0 ? tags.map(t => t.id).join(',') : null,
                                })
                            }
                            availableTags={allTags}
                            tagFactory={projectTagFactory}
                        />
                    </div>

                    {/* Toggles */}
                    <div className="flex flex-col gap-4 pt-2 md:pt-8 min-w-[200px]">
                        {/* My Projects — only for logged-in non-guest users */}
                        {!isGuest && (
                            <div className="flex items-center space-x-2">
                                <Switch
                                    id="show-mine"
                                    checked={showMine}
                                    onCheckedChange={(checked) =>
                                        updateParams({ mine: checked ? 'true' : null })
                                    }
                                />
                                <Label htmlFor="show-mine">My Projects</Label>
                            </div>
                        )}

                        {/* AI suggestions toggle */}
                        <div className={cn('flex items-center space-x-2', !aiEnabled && 'opacity-50 cursor-not-allowed')}>
                            <Switch
                                id="show-suggested"
                                checked={aiEnabled && shouldShowSuggestions}
                                onCheckedChange={() => {
                                    // Collapse/expand the suggestions accordion
                                    setSuggestionsOpen(prev =>
                                        prev.includes('suggestions') ? [] : ['suggestions']
                                    );
                                }}
                                disabled={!aiEnabled}
                            />
                            <Label
                                htmlFor="show-suggested"
                                className={cn(!aiEnabled && 'text-muted-foreground cursor-not-allowed')}
                            >
                                Show Suggestions {!aiEnabled && '(AI required)'}
                            </Label>
                        </div>

                        {/* Match all tags */}
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="match-all"
                                checked={matchAllTags}
                                onCheckedChange={(checked) =>
                                    updateParams({ match: checked ? 'all' : null })
                                }
                            />
                            <Label htmlFor="match-all">Match All Tags</Label>
                        </div>
                    </div>
                </div>

                {/* Active filter summary */}
                {(searchQuery || selectedTags.length > 0 || showMine) && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground font-medium">Active:</span>
                        {showMine && (
                            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                My Projects
                                <button onClick={() => updateParams({ mine: null })} aria-label="Remove my projects filter">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {searchQuery && (
                            <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
                                &ldquo;{searchQuery}&rdquo;
                                <button onClick={clearSearch} aria-label="Clear search query">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        )}
                        {selectedTags.map(tag => (
                            <span
                                key={tag.id}
                                className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full"
                            >
                                {tag.display}
                                <button
                                    onClick={() =>
                                        updateParams({
                                            tags: selectedTags
                                                .filter(t => t.id !== tag.id)
                                                .map(t => t.id)
                                                .join(',') || null,
                                        })
                                    }
                                    aria-label={`Remove tag ${tag.display}`}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        <button
                            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                            onClick={() =>
                                updateParams({ q: null, tags: null, match: null, mine: null, page: null })
                            }
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* ---------------------------------------------------------------- */}
            {/* Results                                                          */}
            {/* ---------------------------------------------------------------- */}
            <div className="flex flex-col gap-8">

                {/* AI Suggestions */}
                {shouldShowSuggestions && (
                    <Accordion
                        type="multiple"
                        value={suggestionsOpen}
                        onValueChange={setSuggestionsOpen}
                        className="w-full border-none"
                    >
                        <AccordionItem value="suggestions" className="border-none">
                            <AccordionTrigger className="hover:no-underline py-0 mb-4">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold tracking-tight">Suggested for you</h2>
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                        AI Recommendation
                                    </span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-0 overflow-visible">
                                <ProjectList
                                    projects={cleanSuggestedProjects}
                                    currentUser={currentUser}
                                    allProjectPathLinks={allProjectPathLinks}
                                    allLearningPaths={allLearningPaths}
                                />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}

                {/* Semantic search results */}
                {sortedSemanticResults && (
                    <div>
                        {shouldShowSuggestions && <Separator className="my-8" />}
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-2xl font-bold tracking-tight">Top Semantic Matches</h2>
                            <span className="text-muted-foreground text-sm font-normal">
                                (AI-generated based on your query)
                            </span>
                        </div>
                        <ProjectList
                            projects={sortedSemanticResults}
                            currentUser={currentUser}
                            allProjectPathLinks={allProjectPathLinks}
                            allLearningPaths={allLearningPaths}
                        />
                    </div>
                )}

                {/* Main project grid */}
                <div className="m-0 border-none p-0">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold tracking-tight">Browse Projects</h2>
                        <span className="text-sm text-muted-foreground">
                            {filteredAndSorted.length} project{filteredAndSorted.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    {filteredAndSorted.length === 0 ? (
                        <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                            <h2 className="text-xl font-semibold">No Projects Found</h2>
                            <p className="mt-2 text-muted-foreground">Try adjusting your filters or clearing your search.</p>
                            <button
                                className="mt-4 text-sm text-primary underline underline-offset-2"
                                onClick={() =>
                                    updateParams({ q: null, tags: null, match: null, mine: null, page: null })
                                }
                            >
                                Clear all filters
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <ProjectList
                                projects={paginatedProjects}
                                currentUser={currentUser}
                                allProjectPathLinks={allProjectPathLinks}
                                allLearningPaths={allLearningPaths}
                            />

                            {/* Pagination */}
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t pt-6 mt-4">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="page-size" className="text-sm font-medium">
                                        Projects per page:
                                    </Label>
                                    <Select
                                        value={pageSize.toString()}
                                        onValueChange={(v) => {
                                            setPageSize(parseInt(v));
                                            updateParams({ page: null }); // reset to page 1
                                        }}
                                    >
                                        <SelectTrigger id="page-size" className="w-[70px] h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">5</SelectItem>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="20">20</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2">
                                        <Button
                                            variant="outline" size="icon"
                                            onClick={() => updateParams({ page: '1' })}
                                            disabled={currentPage === 1}
                                            title="First page"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline" size="icon"
                                            onClick={() => updateParams({ page: String(currentPage - 1) })}
                                            disabled={currentPage === 1}
                                            title="Previous page"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm font-medium mx-2">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline" size="icon"
                                            onClick={() => updateParams({ page: String(currentPage + 1) })}
                                            disabled={currentPage === totalPages}
                                            title="Next page"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline" size="icon"
                                            onClick={() => updateParams({ page: String(totalPages) })}
                                            disabled={currentPage === totalPages}
                                            title="Last page"
                                        >
                                            <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Default export — wraps inner component in Suspense (required for useSearchParams)
// ---------------------------------------------------------------------------

export default function HomeClientPage(props: HomeClientPageProps) {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <HomeClientPageInner {...props} />
        </Suspense>
    );
}
