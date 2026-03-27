
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
import { Sparkles, Loader2, X } from "lucide-react";
import { searchProjectsSemantic } from "@/app/actions/search";
import { toast } from "sonner";

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

export default function HomeClientPage({ allPublishedProjects, currentUser, allTags, allProjectPathLinks, allLearningPaths, suggestedProjects, aiEnabled }: HomeClientPageProps) {
    const [showMyProjects, setShowMyProjects] = useState(false);
    const [showLeadProjectsOnly, setShowLeadProjectsOnly] = useState(false);
    const [showSuggested, setShowSuggested] = useState(true);
    const [selectedTags, setSelectedTags] = useState<ProjectTag[]>([]);
    const [matchAllTags, setMatchAllTags] = useState(false);
    const [sortBy, setSortBy] = useState('latest');
    const [searchQuery, setSearchQuery] = useState("");
    const [semanticResults, setSemanticResults] = useState<HydratedProject[] | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [suggestionsOpen, setSuggestionsOpen] = useState<string[]>(["suggestions"]);

    const isGuest = currentUser?.role === 'guest';

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

    const cleanAndUniqueProjects = useMemo(() => {
        const validProjects = (allPublishedProjects || []).filter(p => p && p.id);
        return Array.from(new Map(validProjects.map(p => [p.id, p])).values());
    }, [allPublishedProjects]);

    const cleanSuggestedProjects = useMemo(() => {
        return (suggestedProjects || []).filter(p => p && typeof p === 'object' && p.id);
    }, [suggestedProjects]);

    const filteredExploreProjects = useMemo(() => {
        const suggestedIds = new Set(cleanSuggestedProjects.map(p => p.id));

        const sourceProjects = showSuggested
            ? cleanAndUniqueProjects.filter(p => !suggestedIds.has(p.id))
            : cleanAndUniqueProjects;

        const filtered = sourceProjects.filter(p => {
            if (showMyProjects && currentUser && !(p.team || []).some(member => member.userId === currentUser.id)) {
                return false;
            }

            if (showLeadProjectsOnly && currentUser) {
                if (!(p.team || []).some(member => member.userId === currentUser.id && member.role === 'lead')) {
                    return false;
                }
            }

            if (selectedTags.length > 0) {
                const projectTagIds = new Set((p.tags || []).map(t => t.id));
                const hasTag = matchAllTags
                    ? selectedTags.every(st => projectTagIds.has(st.id))
                    : selectedTags.some(st => projectTagIds.has(st.id));
                if (!hasTag) return false;
            }
            
            return true;
        });

        return [...filtered].sort((a, b) => {
            if (sortBy === 'popular') return (b.team?.length || 0) - (a.team?.length || 0);
            return new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime();
        });

    }, [cleanAndUniqueProjects, cleanSuggestedProjects, showSuggested, showMyProjects, showLeadProjectsOnly, currentUser, selectedTags, matchAllTags, sortBy]);

    const shouldShowSuggestions = showSuggested && cleanSuggestedProjects.length > 0;
    const noResults = !shouldShowSuggestions && filteredExploreProjects.length === 0;

    return (
        <>
            <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight">Search & Filter</h2>
                    {aiEnabled && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                            <Sparkles className="w-3.5 h-3.5" />
                            AI Powered
                        </div>
                    )}
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
                        <Label htmlFor="tag-selector" className="mb-2 block">Filter by Tags</Label>
                        <TagSelector id="tag-selector" value={selectedTags} onChange={setSelectedTags} availableTags={allTags} tagFactory={projectTagFactory} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-1 md:pt-8 md:gap-6">
                        <div className={cn("flex items-center space-x-2", !aiEnabled && "opacity-50 cursor-not-allowed")}>
                            <Switch 
                                id="show-suggested" 
                                checked={aiEnabled && showSuggested} 
                                onCheckedChange={setShowSuggested} 
                                disabled={!aiEnabled}
                            />
                            <Label htmlFor="show-suggested" className={cn(!aiEnabled && "text-muted-foreground")}>
                                Show Suggestions {!aiEnabled && "(AI required)"}
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="match-all" checked={matchAllTags} onCheckedChange={setMatchAllTags} />
                            <Label htmlFor="match-all">Match All Tags</Label>
                        </div>
                        {!isGuest && currentUser?.role !== 'guest' && (
                           <>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="my-projects" checked={showMyProjects} onCheckedChange={(checked) => setShowMyProjects(!!checked)} />
                                    <Label htmlFor="my-projects">My Projects Only</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox id="lead-projects" checked={showLeadProjectsOnly} onCheckedChange={(checked) => setShowLeadProjectsOnly(!!checked)} />
                                    <Label htmlFor="lead-projects">Projects I Lead</Label>
                                </div>
                            </>
                        )}
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Sort by" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="latest">Latest</SelectItem>
                                <SelectItem value="popular">Most Popular</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {noResults ? (
                 <div className="text-center py-12">
                    <h2 className="text-2xl font-semibold">No Projects Found</h2>
                    <p className="mt-2 text-muted-foreground">Try adjusting your filters to find what you're looking for.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {semanticResults ? (
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <h2 className="text-2xl font-bold tracking-tight">Top Semantic Matches</h2>
                                <span className="text-muted-foreground text-sm font-normal">(AI-generated based on your query)</span>
                            </div>
                            <ProjectList projects={semanticResults} currentUser={currentUser} allProjectPathLinks={allProjectPathLinks} allLearningPaths={allLearningPaths} />
                        </div>
                    ) : (
                        <>
                            {shouldShowSuggestions && (
                        <Accordion 
                            type="multiple" 
                            value={suggestionsOpen} 
                            onValueChange={setSuggestionsOpen}
                            className="w-full border-none"
                        >
                            <AccordionItem value="suggestions" className="border-none">
                                <AccordionTrigger className="hover:no-underline py-0 mb-4">
                                    <h2 className="text-2xl font-bold tracking-tight">Suggested for you</h2>
                                </AccordionTrigger>
                                <AccordionContent className="p-0 overflow-visible">
                                    <ProjectList projects={cleanSuggestedProjects} currentUser={currentUser} allProjectPathLinks={allProjectPathLinks} allLearningPaths={allLearningPaths} />
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                            
                            {filteredExploreProjects.length > 0 && (
                                <div>
                                {shouldShowSuggestions && <Separator className="my-8"/>}
                                    <h2 className="text-2xl font-bold tracking-tight mb-4">Explore Projects</h2>
                                    <ProjectList projects={filteredExploreProjects} currentUser={currentUser} allProjectPathLinks={allProjectPathLinks} allLearningPaths={allLearningPaths} />
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </>
    )
}
