import type { Task, Project, User, Module } from "@/lib/types";
import type { updateTask as UpdateTaskFn, deleteTask as DeleteTaskFn } from "@/app/actions/projects";

declare module "*.svg" {
  const content: string;
  export default content;
}

declare global {
  interface Window {
    // Add any global typings you might need
  }

  type UpdateTaskFunction = UpdateTaskFn;
  type DeleteTaskFunction = DeleteTaskFn;

  type CompletedModuleData = {
    path: { id: string; title: string };
    module: Module;
  };
}
