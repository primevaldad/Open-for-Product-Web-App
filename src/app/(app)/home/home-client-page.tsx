
'use client';

import { useState } from "react";
import type { Project, User, Tag as GlobalTag, ProjectTag } from "@/lib/types";
import { TagSelector } from "@/components/tags/tag-selector";
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

interface HomeClientPageProps {
    allPublishedProjects: Project[];
    currentUser: User;
    allTags: GlobalTag[];
}

export default function HomeClientPage({ allPublishedProjects, currentUser, allTags }: HomeClientPageProps) {
  const [showMyProjects, setShowMyProjects] = useState(false);
  // Corrected state to use the ProjectTag type, as expected by the new TagSelector
  const [selectedTags, setSelectedTags] = useState<ProjectTag[]>([]);
  const [matchAllTags, setMatchAllTags] = useState(false);

  const filteredProjects = allPublishedProjects.filter(p => {
    const myProjectsMatch = !showMyProjects || p.team.some(member => member.userId === currentUser.id);
    
    if (selectedTags.length === 0) {
        return myProjectsMatch;
    }

    const projectTagIds = (p.tags || []).map(t => t.id);

    const tagMatch = matchAllTags
      ? selectedTags.every(filterTag => projectTagIds.includes(filterTag.id))
      : selectedTags.some(filterTag => projectTagIds.includes(filterTag.id));

    return myProjectsMatch && tagMatch;
  });

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
          <h2 className="text-xl font-bold tracking-tight">Filter Projects</h2>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-grow">
                <Label htmlFor="tag-selector" className="mb-2 block">Filter by Tags</Label>
                <TagSelector 
                    value={selectedTags}
                    onChange={setSelectedTags}
                    allTags={allTags}
                    placeholder="Filter by tags..."
                    isEditable={false} // Use the new read-only mode
                />
            </div>
             <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-6 pt-2 md:pt-8">
                <div className="flex items-center space-x-2">
                    <Switch id="match-all" checked={matchAllTags} onCheckedChange={setMatchAllTags} />
                    <Label htmlFor="match-all">Match All Tags</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="my-projects" checked={showMyProjects} onCheckedChange={(checked) => setShowMyProjects(!!checked)} />
                    <Label htmlFor="my-projects">My Projects Only</Label>
                </div>
                <Select defaultValue="latest">
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="latest">Latest</SelectItem>
                        <SelectItem value="popular">Most Popular</SelectItem>
                        <SelectItem value="ending-soon">Ending Soon</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </>
  )
}
