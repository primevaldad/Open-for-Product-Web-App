
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

export default function HomeClientPage({ allPublishedProjects, currentUser, allTags, allProjectPathLinks, allLearningPaths, suggestedProjects, aiEnabled }: HomeClientPageProps) {
    const [showMyProjects, setShowMyProjects] = useState(false);
    const [showLeadProjectsOnly, setShowLeadProjectsOnly] = useState(false);
    const [showSuggested, setShowSuggested] = useState(true);
    const [selectedTags, setSelectedTags] = useState<ProjectTag[]>([]);
    const [matchAllTags, setMatchAllTags] = useState(false);
    const [sortBy, setSortBy] = useState('latest');

    const isGuest = currentUser?.role === 'guest';

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
                <h2 className="text-xl font-bold tracking-tight">Filter Projects</h2>
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex-grow">
                        <Label htmlFor="tag-selector" className="mb-2 block">Filter by Tags</Label>
                        <TagSelector id="tag-selector" value={selectedTags} onChange={setSelectedTags} availableTags={allTags} />
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
                    {shouldShowSuggestions && (
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight mb-4">Suggested for you</h2>
                            <ProjectList projects={cleanSuggestedProjects} currentUser={currentUser} allProjectPathLinks={allProjectPathLinks} allLearningPaths={allLearningPaths} />
                        </div>
                    )}
                    
                    {filteredExploreProjects.length > 0 && (
                        <div>
                           {shouldShowSuggestions && <Separator className="my-8"/>}
                            <h2 className="text-2xl font-bold tracking-tight mb-4">Explore Projects</h2>
                            <ProjectList projects={filteredExploreProjects} currentUser={currentUser} allProjectPathLinks={allProjectPathLinks} allLearningPaths={allLearningPaths} />
                        </div>
                    )}
                </div>
            )}
        </>
    )
}
