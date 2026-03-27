
'use client';

import { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { User, GlobalTag, ProjectTag, ProjectPathLink, LearningPath, HydratedProject } from "@/lib/types";
import TagSelector from "@/components/tags/tag-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import ProjectCard from "@/components/project-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { searchProjectsSemantic } from "@/app/actions/search";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface HomeClientPageProps {
    allPublishedProjects: HydratedProject[];
    currentUser: User | null;
    allTags: GlobalTag[];
    allProjectPathLinks: ProjectPathLink[];
    allLearningPaths: LearningPath[];
    suggestedProjects: HydratedProject[] | null;
    aiEnabled: boolean;
}

const ProjectList = ({ projects, currentUser, allProjectPathLinks, allLearningPaths }: { projects: HydratedProject[], currentUser: User | null, allProjectPathLinks: ProjectPathLink[], allLearningPaths: LearningPath[] }) => {
    if (!projects || projects.length === 0) {
        return null;
    }

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

const projectTagFactory = (tag: { id: string; display: string }): ProjectTag => ({
  id: tag.id,
  display: tag.display,
  isCategory: false,
});

const sortProjects = (projects: HydratedProject[], criteria: string) => {
    console.log(`Sorting ${projects.length} projects by ${criteria}`);
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

export default function HomeClientPage({ allPublishedProjects, currentUser, allTags, allProjectPathLinks, allLearningPaths, suggestedProjects, aiEnabled }: HomeClientPageProps) {
    const [showSuggested, setShowSuggested] = useState(true);
    const [selectedTags, setSelectedTags] = useState<ProjectTag[]>([]);
    const [matchAllTags, setMatchAllTags] = useState(false);
    const [sortBy, setSortBy] = useState('latest');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [semanticResults, setSemanticResults] = useState<HydratedProject[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState<string[]>(["suggestions"]);

    const isGuest = currentUser?.role === 'guest' || !currentUser;

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setSemanticResults(null);
            return;
        }

        setIsSearching(true);
        try {
            const response = await searchProjectsSemantic(query);
            if (response.success && response.data) {
                setSemanticResults(response.data);
                // Auto-collapse suggestions when search results are found
                setSuggestionsOpen([]);
            } else {
                toast.error(response.error || "Failed to perform semantic search");
            }
        } catch (error) {
            console.error("Search error:", error);
            toast.error("An unexpected error occurred during search");
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                handleSearch(searchQuery);
            } else {
                setSemanticResults(null);
                // Re-expand suggestions when search is cleared
                setSuggestionsOpen(["suggestions"]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedTags, matchAllTags, sortBy, searchQuery]);

    const cleanAndUniqueProjects = useMemo(() => {
        const validProjects = (allPublishedProjects || []).filter(p => p && p.id);
        return Array.from(new Map(validProjects.map(p => [p.id, p])).values());
    }, [allPublishedProjects]);

    const cleanSuggestedProjects = useMemo(() => {
        const valid = (suggestedProjects || []).filter(p => p && typeof p === 'object' && p.id);
        return sortProjects(valid, sortBy);
    }, [suggestedProjects, sortBy]);

    const filteredAndSorted = useMemo(() => {
        const sourcePool = cleanAndUniqueProjects;
        
        // 1. Filter by tags
        let filtered = sourcePool.filter(p => {
            if (selectedTags.length > 0) {
                const projectTagIds = new Set((p.tags || []).map(t => t.id));
                const hasTag = matchAllTags
                    ? selectedTags.every(st => projectTagIds.has(st.id))
                    : selectedTags.some(st => projectTagIds.has(st.id));
                if (!hasTag) return false;
            }
            return true;
        });

        // 2. Sort
        return sortProjects(filtered, sortBy);
    }, [cleanAndUniqueProjects, selectedTags, matchAllTags, sortBy]);

    const sortedSemanticResults = useMemo(() => {
        if (!semanticResults) return null;
        return sortProjects(semanticResults, sortBy);
    }, [semanticResults, sortBy]);

    const paginatedProjects = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredAndSorted.slice(start, start + pageSize);
    }, [filteredAndSorted, currentPage, pageSize]);

    const totalPages = Math.ceil(filteredAndSorted.length / pageSize);

    const shouldShowSuggestions = showSuggested && cleanSuggestedProjects.length > 0;

    return (
        <>
            <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold tracking-tight">Search & Filter</h2>
                        {aiEnabled && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                                <Sparkles className="w-3.5 h-3.5" />
                                AI Powered
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="sort-by" className="text-sm shrink-0 font-medium">Sort by:</Label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger id="sort-by" className="w-[160px] h-9 bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="latest">Latest</SelectItem>
                                <SelectItem value="popular">Most Popular</SelectItem>
                                <SelectItem value="trending">Recently Active</SelectItem>
                                <SelectItem value="alphabetical">A-Z</SelectItem>
                                <SelectItem value="alphabetical-desc">Z-A</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {aiEnabled && (
                  <div className="relative">
                      <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                          placeholder="Search projects with AI (e.g. 'apps to help me save money' or 'climate change solutions')..." 
                          className="pl-10 pr-10 py-6 text-lg"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                  handleSearch(searchQuery);
                              } else if (e.key === 'Escape') {
                                  setSearchQuery("");
                                  setSemanticResults(null);
                                  setSuggestionsOpen(["suggestions"]);
                              }
                          }}
                      />
                      {isSearching ? (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
                      ) : searchQuery ? (
                          <button 
                              onClick={() => {
                                  setSearchQuery("");
                                  setSemanticResults(null);
                                  setSuggestionsOpen(["suggestions"]);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
                          >
                              <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                      ) : null}
                  </div>
                )}

                <Separator />

                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-grow">
                        <Label htmlFor="tag-selector" className="mb-2 block font-medium">Filter by Tags</Label>
                        <TagSelector id="tag-selector" value={selectedTags} onChange={setSelectedTags} availableTags={allTags} tagFactory={projectTagFactory} />
                    </div>
                    <div className="flex flex-col gap-4 pt-2 md:pt-8 min-w-[200px]">
                        <div className={cn("flex items-center space-x-2", !aiEnabled && "opacity-50 cursor-not-allowed")}>
                            <Switch 
                                id="show-suggested" 
                                checked={aiEnabled && showSuggested} 
                                onCheckedChange={setShowSuggested} 
                                disabled={!aiEnabled}
                            />
                            <Label htmlFor="show-suggested" className={cn(!aiEnabled && "text-muted-foreground cursor-not-allowed")}>
                                Show Suggestions {!aiEnabled && "(AI required)"}
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="match-all" checked={matchAllTags} onCheckedChange={setMatchAllTags} />
                            <Label htmlFor="match-all">Match All Tags</Label>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-8">
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
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">AI Recommendation</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-0 overflow-visible">
                                <ProjectList projects={cleanSuggestedProjects} currentUser={currentUser} allProjectPathLinks={allProjectPathLinks} allLearningPaths={allLearningPaths} />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}

                {sortedSemanticResults && (
                    <div>
                        {shouldShowSuggestions && <Separator className="my-8"/>}
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-2xl font-bold tracking-tight">Top Semantic Matches</h2>
                            <span className="text-muted-foreground text-sm font-normal">(AI-generated based on your query)</span>
                        </div>
                        <ProjectList projects={sortedSemanticResults} currentUser={currentUser} allProjectPathLinks={allProjectPathLinks} allLearningPaths={allLearningPaths} />
                    </div>
                )}
                
                <div className="m-0 border-none p-0">
                    <h2 className="text-2xl font-bold tracking-tight mb-6">Browse Projects</h2>
                    {(filteredAndSorted.length === 0 && !sortedSemanticResults) ? (
                        <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                            <h2 className="text-xl font-semibold">No Projects Found</h2>
                            <p className="mt-2 text-muted-foreground">Try adjusting your filters or browsing all projects.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            <ProjectList projects={paginatedProjects} currentUser={currentUser} allProjectPathLinks={allProjectPathLinks} allLearningPaths={allLearningPaths} />
                            
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t pt-6 mt-4">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="page-size" className="text-sm font-medium">Projects per page:</Label>
                                    <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(parseInt(v))}>
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
                                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="First page"><ChevronsLeft className="h-4 w-4" /></Button>
                                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} title="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
                                        <span className="text-sm font-medium mx-2">Page {currentPage} of {totalPages}</span>
                                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} title="Next page"><ChevronRight className="h-4 w-4" /></Button>
                                        <Button variant="outline" size="icon" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} title="Last page"><ChevronsRight className="h-4 w-4" /></Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
