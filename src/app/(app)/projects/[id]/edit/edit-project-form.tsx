'use client';

import type { User, GlobalTag, Project } from "@/lib/types";
import { ProjectForm } from "@/components/projects/project-form";

interface EditProjectFormProps {
  project: Project;
  users: User[];
  allTags: GlobalTag[];
}

export default function EditProjectForm({ project, users, allTags }: EditProjectFormProps) {
  return <ProjectForm initialData={project} users={users} tags={allTags} />;
}
