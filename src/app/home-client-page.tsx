
'use client';

import { useState } from "react";
import type { Project, ProjectCategory, User } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { projectCategories } from "@/lib/data";
import { Button } from "@/components/ui/button";
import ProjectCard from "@/components/project-card";

interface HomeClientPageProps {
    allPublishedProjects: Project[];
    currentUser: User;
}

export default function HomeClientPage({ allPublishedProjects, currentUser }: HomeClientPageProps) {
  const [selectedCategories, setSelectedCategories] = useState<ProjectCategory[]>([]);
  const [showMyProjects, setShowMyProjects] = useState(false);

  const toggleCategory = (category: ProjectCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };
  
  const filteredProjects = allPublishedProjects.filter(p => {
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(p.category);
    const myProjectsMatch = !showMyProjects || p.team.some(member => member.user && member.user.id === currentUser.id);
    return categoryMatch && myProjectsMatch;
  });

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <h2 className="text-2xl font-bold tracking-tight">All Projects</h2>
          <div className="flex flex-wrap items-center gap-2">
            {projectCategories.map(({ name, icon: Icon }) => (
              <Button 
                key={name} 
                variant={selectedCategories.includes(name) ? "default" : "outline"} 
                className="gap-2"
                onClick={() => toggleCategory(name)}
              >
                <Icon className="h-4 w-4" />
                {name}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-4 md:ml-auto">
            <div className="flex items-center space-x-2">
              <Checkbox id="my-projects" checked={showMyProjects} onCheckedChange={(checked) => setShowMyProjects(!!checked)} />
              <Label htmlFor="my-projects">My Projects</Label>
            </div>
            <Select defaultValue="latest">
              <SelectTrigger className="w-[180px]">
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
