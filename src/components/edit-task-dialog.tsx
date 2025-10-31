
'use client';

import { useState, useTransition, type PropsWithChildren, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { HydratedProjectMember, ServerActionResponse, ClientTask } from '@/lib/types';
import { toDate } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Trash } from 'lucide-react';

interface EditTaskDialogProps extends PropsWithChildren {
  task: ClientTask;
  isTeamMember: boolean;
  projectTeam: HydratedProjectMember[];
  updateTask: (values: TaskFormValues) => Promise<ServerActionResponse>;
  deleteTask: (values: { id: string; projectId: string }) => Promise<ServerActionResponse>;
}

// This schema MUST be kept in sync with the TaskFormValues type in lib/types.ts
const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  status: z.enum(["To Do", "In Progress", "Done", "Archived"]),
  assignedToId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  dueDate: z.string().optional(), // Add dueDate to the schema
});
export type TaskFormValues = z.infer<typeof TaskSchema>;
export type TaskStatus = TaskFormValues["status"];

const taskStatuses = ["To Do", "In Progress", "Done", "Archived"] as const;

export function EditTaskDialog({ task, isTeamMember, projectTeam, updateTask, deleteTask, children }: EditTaskDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isDeletePending, startDeleteTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(TaskSchema),
    defaultValues: {
      id: task.id,
      projectId: task.projectId,
      title: task.title,
      description: task.description ?? undefined,
      status: task.status,
      assignedToId: task.assignedToId ?? undefined,
      estimatedHours: task.estimatedHours ?? undefined,
      dueDate: task.dueDate ? task.dueDate.toISOString() : undefined, // Convert Date to string
    },
  });

  const onSubmit = (values: TaskFormValues) => {
    if (!isTeamMember) {
      toast({ variant: 'destructive', title: 'Error', description: 'Only team members can edit tasks.' });
      return;
    }

    startTransition(async () => {
      const result = await updateTask(values);
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Task Updated!', description: 'Your changes have been saved.' });
        setIsOpen(false);
        form.reset(); // Reset form state on successful submission
      }
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
        const result = await deleteTask({ id: task.id, projectId: task.projectId });
        if (!result.success) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            toast({ title: 'Task Deleted', description: 'The task has been removed.' });
            setIsOpen(false);
        }
    });
  };

  // Reset form values when the dialog is opened or task data changes
  // This ensures the form is always up-to-date with the task prop
  useEffect(() => {
    form.reset({
        id: task.id,
        projectId: task.projectId,
        title: task.title,
        description: task.description ?? undefined,
        status: task.status,
        assignedToId: task.assignedToId ?? undefined,
        estimatedHours: task.estimatedHours ?? undefined,
        dueDate: task.dueDate ? task.dueDate.toISOString() : undefined,
    });
  }, [task, form.reset]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={!isTeamMember} onClick={(e) => { if (isTeamMember) { setIsOpen(true); e.preventDefault();} }}>
        {children}
      </DialogTrigger>
      {isOpen && (
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
                Update task details, reassign, or change its status.
            </DialogDescription>
            </DialogHeader>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                        <Input {...field} placeholder="e.g., Design the homepage" />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea {...field} value={field.value ?? ''} placeholder="Add more details about the task..." />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {taskStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="assignedToId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Assigned To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? 'unassigned'}>
                            <FormControl>
                            <SelectTrigger><SelectValue placeholder="Assign to a member" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {projectTeam.map(member => (
                                    member.user && (
                                        <SelectItem key={member.user.id} value={member.user.id}>
                                            {member.user.name}
                                        </SelectItem>
                                    )
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="estimatedHours"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Estimated Hours</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} value={field.value ?? 0} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <DialogFooter className="pt-4">
                <div className="flex justify-between w-full">
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive" disabled={isDeletePending}>
                        <Trash className="mr-2 h-4 w-4" />
                        {isDeletePending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the task.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Confirm</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>

                    <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                    </div>
                </div>
                </DialogFooter>
            </form>
            </Form>
        </DialogContent>
      )}
    </Dialog>
  );
}
export default EditTaskDialog;