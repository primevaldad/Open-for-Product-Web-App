
'use client';

import { useState, useTransition, type PropsWithChildren } from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
// import {
//     AlertDialog,
//     AlertDialogAction,
//     AlertDialogCancel,
//     AlertDialogContent,
//     AlertDialogDescription,
//     AlertDialogFooter,
//     AlertDialogHeader,
//     AlertDialogTitle,
//     AlertDialogTrigger,
// } from "@/components/ui/alert-dialog"
// import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// import { Input } from '@/components/ui/input';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Textarea } from '@/components/ui/textarea';
import type { ProjectMember, Task, TaskStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import type { deleteTask, updateTask } from '@/app/actions/projects';
import { Trash } from 'lucide-react';

interface EditTaskDialogProps extends PropsWithChildren {
  task: Task;
  isTeamMember: boolean;
  projectTeam: ProjectMember[];
  updateTask: typeof updateTask;
  deleteTask: typeof deleteTask;
}

// const TaskSchema = z.object({
//   id: z.string(),
//   projectId: z.string(),
//   title: z.string().min(1, "Title is required."),
//   description: z.string().optional(),
//   status: z.enum(["To Do", "In Progress", "Done"]),
//   assignedToId: z.string().optional().nullable(),
//   estimatedHours: z.coerce.number().optional(),
// });

// type TaskFormValues = z.infer<typeof TaskSchema>;

// const taskStatuses: TaskStatus[] = ["To Do", "In Progress", "Done"];

export function EditTaskDialog({ task, isTeamMember, projectTeam, updateTask, deleteTask, children }: EditTaskDialogProps) {
  // const { toast } = useToast();
  // const [isPending, startTransition] = useTransition();
  // const [isDeletePending, startDeleteTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  // const form = useForm<TaskFormValues>({
  //   resolver: zodResolver(TaskSchema),
  //   defaultValues: {
  //     id: task.id,
  //     projectId: task.projectId,
  //     title: task.title,
  //     description: task.description ?? '',
  //     status: task.status,
  //     assignedToId: task.assignedTo?.id ?? 'unassigned',
  //     estimatedHours: task.estimatedHours ?? 0,
  //   },
  // });

  // const onSubmit = (values: TaskFormValues) => {
  //   if (!isTeamMember) {
  //     toast({ variant: 'destructive', title: 'Error', description: 'Only team members can edit tasks.' });
  //     return;
  //   }

  //   startTransition(async () => {
  //     // Handle "unassigned" case
  //     const submissionValues = {
  //       ...values,
  //       assignedToId: values.assignedToId === 'unassigned' ? undefined : values.assignedToId,
  //     };

  //     const result = await updateTask(submissionValues);
  //     if (result?.error) {
  //       toast({ variant: 'destructive', title: 'Error', description: result.error });
  //     } else {
  //       toast({ title: 'Task Updated!', description: 'Your changes have been saved.' });
  //       setIsOpen(false);
  //     }
  //   });
  // };

  // const handleDelete = () => {
  //   startDeleteTransition(async () => {
  //       const result = await deleteTask({ id: task.id, projectId: task.projectId });
  //       if (result?.error) {
  //           toast({ variant: 'destructive', title: 'Error', description: result.error });
  //       } else {
  //           toast({ title: 'Task Deleted', description: 'The task has been removed.' });
  //           setIsOpen(false);
  //       }
  //   });
  // };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={!isTeamMember} onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            This is a placeholder. The form is currently disabled for debugging.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p>Task: {task.title}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="button" disabled>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
