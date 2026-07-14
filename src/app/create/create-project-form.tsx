'use client';

import type { User, GlobalTag } from "@/lib/types";
import { ProjectForm } from "@/components/projects/project-form";

interface CreateProjectFormProps {
  users: User[];
  tags: GlobalTag[];
}

export function CreateProjectForm({ users, tags }: CreateProjectFormProps) {
  return <ProjectForm users={users} tags={tags} />;
}
