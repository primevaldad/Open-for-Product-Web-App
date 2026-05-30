
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
    // Local Filter State (initialized from URL)
    // -------------------------------------------------------------------------

    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');
    const [selectedTags, setSelectedTags] = useState<ProjectTag[]>(() => {
        const ids = (searchParams.get('tags') ?? '').split(',').filter(Boolean);
        return ids
            .map(id => allTags.find(t => t.id === id))
            .filter((t): t is GlobalTag => !!t)
            .map(projectTagFactory);
    });
    const [matchAllTags, setMatchAllTags] = useState(searchParams.get('match') === 'all');
    const [sortBy, setSortBy] = useState(searchParams.get('sort') ?? 'latest');
    const [showMine, setShowMine] = useState(!isGuest && searchParams.get('mine') === 'true');
    const [currentPage, setCurrentPage] = useState(Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)));
    const [pageSize, setPageSize] = useState(10);

    // Sync state to URL purely for shareability (avoids Next.js server refetch lag)
    useEffect(() => {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        if (selectedTags.length > 0) params.set('tags', selectedTags.map(t => t.id).join(','));
        if (matchAllTags) params.set('match', 'all');
        if (sortBy !== 'latest') params.set('sort', sortBy);
        if (showMine) params.set('mine', 'true');
        if (currentPage > 1) params.set('page', currentPage.toString());

        const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
        // replaceState does not trigger Next.js navigation, keeping UI instant
        window.history.replaceState(null, '', newUrl);
    }, [searchQuery, selectedTags, matchAllTags, sortBy, showMine, currentPage, pathname]);

    // Listen to browser Back/Forward to update state
    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            setSearchQuery(params.get('q') ?? '');
            const ids = (params.get('tags') ?? '').split(',').filter(Boolean);
            setSelectedTags(
                ids.map(id => allTags.find(t => t.id === id))
                   .filter((t): t is GlobalTag => !!t)
                   .map(projectTagFactory)
            );
            setMatchAllTags(params.get('match') === 'all');
            setSortBy(params.get('sort') ?? 'latest');
            setShowMine(!isGuest && params.get('mine') === 'true');
            setCurrentPage(Math.max(1, parseInt(params.get('page') ?? '1', 10)));
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isGuest, allTags]);

    // -------------------------------------------------------------------------
    // Local UI state
    // -------------------------------------------------------------------------

    const [inputValue, setInputValue] = useState(searchQuery);
    const [semanticResults, setSemanticResults] = useState<HydratedProject[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState<string[]>(['suggestions']);

    // Debounce text input -> search query
    useEffect(() => {
        const timer = setTimeout(() => {
            const trimmed = inputValue.trim();
            if (searchQuery !== trimmed) {
                setSearchQuery(trimmed);
                setCurrentPage(1); // Reset page on new search
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [inputValue, searchQuery]);

    const clearSearch = useCallback(() => {
        setInputValue('');
        setSearchQuery('');
        setSemanticResults(null);
        setSuggestionsOpen(['suggestions']);
        setCurrentPage(1);
    }, []);

    const clearAllFilters = useCallback(() => {
        setInputValue('');
        setSearchQuery('');
        setSelectedTags([]);
        setMatchAllTags(false);
        setShowMine(false);
        setSortBy('latest');
        setCurrentPage(1);
    }, []);

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

    const shouldShowSuggestions = cleanSuggestedProjects.length > 0;

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
                            onValueChange={(v) => {
                                setSortBy(v);
                                setCurrentPage(1);
                            }}
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
                            if (e.key === 'Enter') {
                                // Immediate search on Enter
                                const trimmed = inputValue.trim();
                                if (searchQuery !== trimmed) {
                                    setSearchQuery(trimmed);
                                    setCurrentPage(1);
                                }
                                if (aiEnabled && trimmed) {
                                    handleSemanticSearch(trimmed);
                                }
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
                            onChange={(tags) => {
                                setSelectedTags(tags);
                                setCurrentPage(1);
                            }}
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
                                    onCheckedChange={(checked) => {
                                        setShowMine(checked);
                                        setCurrentPage(1);
                                    }}
                                />
                                <Label htmlFor="show-mine">My Projects</Label>
                            </div>
                        )}

                        {/* Suggestions toggle */}
                        <div className={cn('flex items-center space-x-2', !shouldShowSuggestions && 'opacity-50 cursor-not-allowed')}>
                            <Switch
                                id="show-suggested"
                                checked={shouldShowSuggestions && suggestionsOpen.includes('suggestions')}
                                onCheckedChange={() => {
                                    // Collapse/expand the suggestions accordion
                                    setSuggestionsOpen(prev =>
                                        prev.includes('suggestions') ? [] : ['suggestions']
                                    );
                                }}
                                disabled={!shouldShowSuggestions}
                            />
                            <Label
                                htmlFor="show-suggested"
                                className={cn(!shouldShowSuggestions && 'text-muted-foreground cursor-not-allowed')}
                            >
                                Show Suggestions
                            </Label>
                        </div>

                        {/* Match all tags */}
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="match-all"
                                checked={matchAllTags}
                                onCheckedChange={(checked) => {
                                    setMatchAllTags(checked);
                                    setCurrentPage(1);
                                }}
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
                                <button onClick={() => { setShowMine(false); setCurrentPage(1); }} aria-label="Remove my projects filter">
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
                                    onClick={() => {
                                        setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
                                        setCurrentPage(1);
                                    }}
                                    aria-label={`Remove tag ${tag.display}`}
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        <button
                            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                            onClick={clearAllFilters}
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
                                    {aiEnabled && currentUser && (
                                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                            AI Recommendation
                                        </span>
                                    )}
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
                                onClick={clearAllFilters}
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
                                            setCurrentPage(1); // reset to page 1
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
                                            onClick={() => setCurrentPage(1)}
                                            disabled={currentPage === 1}
                                            title="First page"
                                        >
                                            <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline" size="icon"
                                            onClick={() => setCurrentPage(currentPage - 1)}
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
                                            onClick={() => setCurrentPage(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            title="Next page"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline" size="icon"
                                            onClick={() => setCurrentPage(totalPages)}
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
