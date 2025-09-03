
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { addTeamMember } from '@/app/actions/projects';
import type { User, UserRole } from '@/lib/types';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface AddMemberDialogProps extends PropsWithChildren {
  projectId: string;
  nonMemberUsers: User[];
  addTeamMember: typeof addTeamMember;
}

const AddMemberSchema = z.object({
  projectId: z.string(),
  userId: z.string().min(1, 'Please select a user to add.'),
  role: z.enum(['participant', 'lead']),
});

type AddMemberFormValues = z.infer<typeof AddMemberSchema>;

export function AddMemberDialog({ projectId, nonMemberUsers, addTeamMember, children }: AddMemberDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(AddMemberSchema),
    defaultValues: {
      projectId: projectId,
      userId: '',
      role: 'participant',
    },
  });

  const onSubmit = (values: AddMemberFormValues) => {
    startTransition(async () => {
      const result = await addTeamMember(values);
      if (result?.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Member Added!', description: 'The user has been added to the project team.' });
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
          <DialogTitle>Add Team Member</DialogTitle>
          <DialogDescription>
            Invite a new member to collaborate on this project.
          </DialogDescription>
        </DialogHeader>
        {nonMemberUsers.length > 0 ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a user to invite" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {nonMemberUsers.map(user => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Role</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="participant" />
                          </FormControl>
                          <FormLabel className="font-normal">
                           Participant
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="lead" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Lead
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Adding...' : 'Add Member'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
            <div className="text-center text-sm text-muted-foreground py-8">
                <p>All users are already members of this project.</p>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
