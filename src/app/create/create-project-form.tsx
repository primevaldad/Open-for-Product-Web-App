'use client';

import type { User, Tag } from "@/lib/types";
import { ProjectForm } from "@/components/projects/project-form";

interface CreateProjectFormProps {
  users: User[];
  tags: Tag[];
}

export function CreateProjectForm({ users, tags }: CreateProjectFormProps) {
  return <ProjectForm users={users} tags={tags} />;
}
