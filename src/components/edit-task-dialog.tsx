
'use client';

import { useState, useTransition, type PropsWithChildren } from 'react';
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
import type { ProjectMember, Task, TaskStatus } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { deleteTask, updateTask } from '@/app/actions/projects';
import { Trash } from 'lucide-react';

interface EditTaskDialogProps extends PropsWithChildren {
  task: Task;
  isTeamMember: boolean;
  projectTeam: ProjectMember[];
}

const TaskSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done']),
  assignedToId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
});

type TaskFormValues = z.infer<typeof TaskSchema>;

const taskStatuses: TaskStatus[] = ['To Do', 'In Progress', 'Done'];

export function EditTaskDialog({ task, isTeamMember, projectTeam, children }: EditTaskDialogProps) {
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
      description: task.description ?? '',
      status: task.status,
      assignedToId: task.assignedTo?.id ?? 'unassigned',
      estimatedHours: task.estimatedHours ?? 0,
    },
  });

  const onSubmit = (values: TaskFormValues) => {
    if (!isTeamMember) {
      toast({ variant: 'destructive', title: 'Error', description: 'Only team members can edit tasks.' });
      return;
    }

    startTransition(async () => {
      // Handle "unassigned" case
      const submissionValues = {
        ...values,
        assignedToId: values.assignedToId === 'unassigned' ? undefined : values.assignedToId,
      };

      const result = await updateTask(submissionValues);
      if (result?.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Task Updated!', description: 'Your changes have been saved.' });
        setIsOpen(false);
      }
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
        const result = await deleteTask({ id: task.id, projectId: task.projectId });
        if (result?.error) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            toast({ title: 'Task Deleted', description: 'The task has been removed.' });
            setIsOpen(false);
        }
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={!isTeamMember} onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Make changes to the task details. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Textarea {...field} />
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
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {taskStatuses.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
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
                    <FormLabel>Assign to</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {projectTeam.map(member => (
                            <SelectItem key={member.user.id} value={member.user.id}>{member.user.name}</SelectItem>
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
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" className="w-full sm:w-auto" disabled={isDeletePending}>
                        <Trash className="mr-2 h-4 w-4" />
                        {isDeletePending ? 'Deleting...' : 'Delete Task'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the task.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <div className="flex gap-2 justify-end mt-2 sm:mt-0">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
