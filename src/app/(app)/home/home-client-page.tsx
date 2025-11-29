
'use client';

import { useState, useMemo } from "react";
import type { User, Tag as GlobalTag, ProjectTag, ProjectPathLink, LearningPath, HydratedProject } from "@/lib/types";
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
import { Separator } from "@/components/ui/separator";

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
    if (projects.length === 0) {
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

export default function HomeClientPage({ allPublishedProjects, currentUser, allTags, allProjectPathLinks, allLearningPaths, suggestedProjects, aiEnabled }: HomeClientPageProps) {
    const [showMyProjects, setShowMyProjects] = useState(true);
    const [showSuggested, setShowSuggested] = useState(true);
    const [selectedTags, setSelectedTags] = useState<ProjectTag[]>([]);
    const [matchAllTags, setMatchAllTags] = useState(false);
    const [sortBy, setSortBy] = useState('latest');

    const isGuest = currentUser?.role === 'guest';

    // 1. Clean and de-duplicate all incoming project data at the source.
    const cleanAndUniqueProjects = useMemo(() => {
        const validProjects = (allPublishedProjects || []).filter(p => p && p.id);
        return Array.from(new Map(validProjects.map(p => [p.id, p])).values());
    }, [allPublishedProjects]);

    const cleanSuggestedProjects = useMemo(() => {
        const validSuggested = (suggestedProjects || []).filter(p => p && p.id);
        const suggestedIds = new Set(validSuggested.map(p => p.id));
        // Ensure suggested projects are also present in the main list for consistency
        return cleanAndUniqueProjects.filter(p => suggestedIds.has(p.id));
    }, [suggestedProjects, cleanAndUniqueProjects]);

    // 2. Create the list for "Explore Projects" - all projects excluding suggestions if they are shown separately.
    const exploreProjects = useMemo(() => {
        const suggestedIds = new Set(cleanSuggestedProjects.map(p => p.id));
        if (showSuggested) {
            return cleanAndUniqueProjects.filter(p => !suggestedIds.has(p.id));
        }
        return cleanAndUniqueProjects;
    }, [cleanAndUniqueProjects, cleanSuggestedProjects, showSuggested]);


    // 3. Apply filters to the "Explore Projects" list.
    const filteredExploreProjects = useMemo(() => {
        const sourceProjects = exploreProjects;

        const filtered = sourceProjects.filter(p => {
            const team = p.team || [];
            const myProjectsMatch = !showMyProjects || (currentUser && team.some(member => member.userId === currentUser.id));

            if (selectedTags.length === 0) {
                return myProjectsMatch;
            }

            const projectTagIds = (p.tags || []).map(t => t.id);
            const tagMatch = matchAllTags
                ? selectedTags.every(filterTag => projectTagIds.includes(filterTag.id))
                : selectedTags.some(filterTag => projectTagIds.includes(filterTag.id));

            return myProjectsMatch && tagMatch;
        });

        return [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'popular':
                    return (b.team?.length || 0) - (a.team?.length || 0);
                case 'latest':
                default:
                    return new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime();
            }
        });
    }, [exploreProjects, showMyProjects, currentUser, selectedTags, matchAllTags, sortBy]);

    const noResults = cleanSuggestedProjects.length === 0 && filteredExploreProjects.length === 0;

    return (
        <>
            <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
                <h2 className="text-xl font-bold tracking-tight">Filter Projects</h2>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-grow">
                        <Label htmlFor="tag-selector" className="mb-2 block">Filter by Tags</Label>
                        <TagSelector
                            id="tag-selector"
                            value={selectedTags}
                            onChange={setSelectedTags}
                            availableTags={allTags}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-1 md:pt-8 md:gap-6">
                        <div className="flex items-center space-x-2">
                            <Switch id="show-suggested" checked={showSuggested} onCheckedChange={setShowSuggested} />
                            <Label htmlFor="show-suggested">Show Suggestions</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="match-all" checked={matchAllTags} onCheckedChange={setMatchAllTags} />
                            <Label htmlFor="match-all">Match All Tags</Label>
                        </div>
                        {!isGuest && currentUser && (
                            <div className="flex items-center space-x-2">
                                <Checkbox id="my-projects" checked={showMyProjects} onCheckedChange={(checked) => setShowMyProjects(!!checked)} />
                                <Label htmlFor="my-projects">My Projects Only</Label>
                            </div>
                        )}
                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
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
                    {showSuggested && cleanSuggestedProjects.length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight mb-4">Suggested for you</h2>
                            <ProjectList 
                                projects={cleanSuggestedProjects}
                                currentUser={isGuest ? null : currentUser}
                                allProjectPathLinks={allProjectPathLinks}
                                allLearningPaths={allLearningPaths}
                            />
                        </div>
                    )}
                    
                    {filteredExploreProjects.length > 0 && (
                        <div>
                            <Separator />
                            <h2 className="text-2xl font-bold tracking-tight mt-8 mb-4">Explore Projects</h2>
                            <ProjectList 
                                projects={filteredExploreProjects}
                                currentUser={isGuest ? null : currentUser}
                                allProjectPathLinks={allProjectPathLinks}
                                allLearningPaths={allLearningPaths}
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
