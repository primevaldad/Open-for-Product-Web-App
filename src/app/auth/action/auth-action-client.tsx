'use client';

import { useState, useEffect, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';

import { auth } from '@/lib/firebase';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, CheckCircle2, XCircle } from 'lucide-react';

const formSchema = z.object({
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export default function AuthActionClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');
  
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'verifying' | 'valid' | 'invalid' | 'success'>('verifying');
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Verify the code on load without consuming it
  useEffect(() => {
    if (!mode || !oobCode) {
      setStatus('invalid');
      setError("Invalid or missing action link parameters.");
      return;
    }

    if (mode === 'resetPassword') {
      verifyPasswordResetCode(auth, oobCode)
        .then((userEmail) => {
          setEmail(userEmail);
          setStatus('valid');
        })
        .catch((err) => {
          console.error("Verification error:", err);
          setStatus('invalid');
          if (err.code === 'auth/invalid-action-code' || err.code === 'auth/expired-action-code') {
            setError("Your request to reset your password has expired or the link has already been used. Please try requesting a new link.");
          } else {
            setError(err.message || "An error occurred while verifying your request.");
          }
        });
    } else {
      // Handle other modes like recoverEmail or verifyEmail if needed in the future
      setStatus('invalid');
      setError("Unsupported action mode.");
    }
  }, [mode, oobCode]);

  async function onSubmit(values: FormValues) {
    if (!oobCode) return;
    
    setError(null);
    startTransition(async () => {
      try {
        await confirmPasswordReset(auth, oobCode, values.password);
        setStatus('success');
      } catch (err: any) {
        console.error("Password confirmation error:", err);
        setError(err.message || "Failed to reset password. Please try again.");
      }
    });
  }

  // --- Render States ---

  if (status === 'verifying') {
    return (
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold">Verifying Link...</h1>
        <p className="text-muted-foreground">Please wait while we check your secure link.</p>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-lg shadow-lg">
        <div className="flex flex-col items-center text-center space-y-4">
          <XCircle className="w-12 h-12 text-destructive" />
          <h1 className="text-2xl font-bold">Link Expired</h1>
          <p className="text-muted-foreground">
            {error || "This link is no longer valid. It may have expired or already been used."}
          </p>
        </div>
        <div className="pt-4">
          <Button asChild className="w-full">
            <Link href="/login">Return to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-lg shadow-lg">
        <div className="flex flex-col items-center text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
          <h1 className="text-2xl font-bold">Password Reset!</h1>
          <p className="text-muted-foreground">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
        </div>
        <div className="pt-4">
          <Button asChild className="w-full">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  // status === 'valid'
  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-card text-card-foreground rounded-lg shadow-lg">
      <div className="text-center">
        <h1 className="text-3xl font-bold">New Password</h1>
        <p className="text-muted-foreground mt-2">
          Create a new password for <br/> <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} disabled={isPending} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Password'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
