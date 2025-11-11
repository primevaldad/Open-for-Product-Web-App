'use client';

import { useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Task, User } from "@/lib/types";
import { TaskSchema, type TaskFormValues, TaskStatusSchema } from '@/lib/schemas';

interface EditTaskDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (values: TaskFormValues) => void;
    task: Task | null; // Can be null for creating a new task
    teamMembers: User[];
}

export function EditTaskDialog({ isOpen, onClose, onSave, task, teamMembers }: EditTaskDialogProps) {
    const isEditing = !!task;

    const form = useForm<TaskFormValues>({
        resolver: zodResolver(TaskSchema),
        defaultValues: {
            id: task?.id,
            title: task?.title || '',
            description: task?.description || '',
            status: task?.status || 'To Do',
            assigneeId: task?.assignedToId || undefined,
            estimatedHours: task?.estimatedHours || undefined,
            dueDate: task?.dueDate ? new Date(task.dueDate as string) : undefined,
        },
    });

    useEffect(() => {
        form.reset(
            task
                ? { 
                    id: task.id,
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    assigneeId: task.assignedToId,
                    estimatedHours: task.estimatedHours,
                    dueDate: task.dueDate ? new Date(task.dueDate as string) : undefined,
                  }
                : {
                    title: '',
                    description: '',
                    status: 'To Do',
                    assigneeId: undefined,
                    estimatedHours: undefined,
                    dueDate: undefined,
                  }
        );
    }, [task, form]);

    function onSubmit(values: TaskFormValues) {
        onSave(values);
        onClose(); 
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Task' : 'Add New Task'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="status" render={({ field }) => ( <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{TaskStatusSchema.options.map(status => ( <SelectItem key={status} value={status}>{status}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="assigneeId" render={({ field }) => ( <FormItem><FormLabel>Assignee</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select an assignee" /></SelectTrigger></FormControl><SelectContent>{teamMembers.map((member) => ( <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem> ))}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="estimatedHours" render={({ field }) => ( <FormItem><FormLabel>Estimated Hours</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="dueDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Due Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} >{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                        <Button type="submit">{isEditing ? 'Save Changes' : 'Create Task'}</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
