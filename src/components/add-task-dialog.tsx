
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { ServerActionResponse } from '@/lib/types';
import { TaskSchema, type TaskStatus } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

// Create a new schema that extends the base TaskSchema with the projectId
const AddTaskDialogSchema = TaskSchema.extend({
  projectId: z.string(),
});

// Infer the type from the new schema
type AddTaskDialogFormValues = z.infer<typeof AddTaskDialogSchema>;

interface AddTaskDialogProps extends PropsWithChildren {
  projectId: string;
  status: TaskStatus;
  addTask: (values: AddTaskDialogFormValues) => Promise<ServerActionResponse>;
}

export function AddTaskDialog({ projectId, status, addTask, children }: AddTaskDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<AddTaskDialogFormValues>({
    resolver: zodResolver(AddTaskDialogSchema),
    defaultValues: {
      projectId: projectId,
      title: '',
      description: '',
      status: status,
    },
  });

  const onSubmit = (values: AddTaskDialogFormValues) => {
    startTransition(async () => {
      const result = await addTask(values);
      if (!result.success) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Task Created!', description: 'The new task has been added to the board.' });
        setIsOpen(false);
        form.reset();
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Fill in the details for the new task and add it to the board.
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Add more details about the task..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Adding...' : 'Add Task'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
