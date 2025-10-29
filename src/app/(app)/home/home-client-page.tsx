
'use client';

import { useState } from "react";
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
import { SuggestSteps } from "@/components/ai/suggest-steps";
import ProjectCard from "@/components/project-card";

interface HomeClientPageProps {
    allPublishedProjects: HydratedProject[];
    currentUser: User | null;
    allTags: GlobalTag[];
    allProjectPathLinks: ProjectPathLink[];
    allLearningPaths: LearningPath[];
}

export default function HomeClientPage({ allPublishedProjects, currentUser, allTags, allProjectPathLinks, allLearningPaths }: HomeClientPageProps) {
  const [showMyProjects, setShowMyProjects] = useState(false);
  const [selectedTags, setSelectedTags] = useState<ProjectTag[]>([]);
  const [matchAllTags, setMatchAllTags] = useState(false);
  const [sortBy, setSortBy] = useState('latest');

  const filteredProjects = allPublishedProjects.filter(p => {
    const myProjectsMatch = !showMyProjects || (currentUser && p.team.some(member => member.userId === currentUser.id));
    
    if (selectedTags.length === 0) {
        return myProjectsMatch;
    }

    const projectTagIds = (p.tags || []).map(t => t.id);

    const tagMatch = matchAllTags
      ? selectedTags.every(filterTag => projectTagIds.includes(filterTag.id))
      : selectedTags.some(filterTag => projectTagIds.includes(filterTag.id));

    return myProjectsMatch && tagMatch;
  });

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return (b.team?.length || 0) - (a.team?.length || 0);
      case 'latest':
      default:
        // @ts-ignore
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return (
    <>
      {currentUser && (
        <div className="mb-8">
            <SuggestSteps
                currentUser={currentUser}
                allProjects={allPublishedProjects}
                allProjectPathLinks={allProjectPathLinks}
                allLearningPaths={allLearningPaths}
            />
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
        <h2 className="text-xl font-bold tracking-tight">Filter Projects</h2>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex-grow">
            <Label htmlFor="tag-selector" className="mb-2 block">Filter by Tags</Label>
            <TagSelector 
              value={selectedTags}
              onChange={setSelectedTags}
              tags={allTags}
            />
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6 pt-2 md:pt-8">
            <div className="flex items-center space-x-2">
              <Switch id="match-all" checked={matchAllTags} onCheckedChange={setMatchAllTags} />
              <Label htmlFor="match-all">Match All Tags</Label>
            </div>
            {currentUser && (
              <div className="flex items-center space-x-2">
                <Checkbox id="my-projects" checked={showMyProjects} onCheckedChange={(checked) => setShowMyProjects(!!checked)} />
                <Label htmlFor="my-projects">My Projects Only</Label>
              </div>
            )}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[180px]">
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

      {sortedProjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedProjects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              currentUser={currentUser}
              allProjectPathLinks={allProjectPathLinks}
              allLearningPaths={allLearningPaths}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold">No Projects Found</h2>
          <p className="mt-2 text-muted-foreground">Try adjusting your filters to find what you're looking for.</p>
        </div>
      )}
    </>
  )
}
