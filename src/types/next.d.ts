
import type { updateTask as UpdateTaskFn, deleteTask as DeleteTaskFn } from "@/app/actions/projects";

declare module "*.svg" {
  const content: string;
  export default content;
}

declare global {
  interface Window {
    // Add unknown global typings you might need
  }

  type UpdateTaskFunction = UpdateTaskFn;
  type DeleteTaskFunction = DeleteTaskFn;

  // CompletedModuleData is now defined in src/lib/types.ts
}
