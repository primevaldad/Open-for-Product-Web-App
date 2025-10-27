'use client';

import type { User, Tag, Project } from "@/lib/types";
import { ProjectForm } from "@/components/projects/project-form";

interface EditProjectFormProps {
  project: Project;
  users: User[];
  allTags: Tag[];
}

export default function EditProjectForm({ project, users, allTags }: EditProjectFormProps) {
  return <ProjectForm initialData={project} users={users} tags={allTags} />;
}
