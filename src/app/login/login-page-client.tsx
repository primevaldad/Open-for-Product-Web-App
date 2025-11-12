
'use client';

import { useState, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/components/auth-provider';

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPageClient() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { currentUser } = useAuth(); // Use auth context

  // If the AuthProvider determines there's a user, redirect to home.
  // This handles the client-side check after the initial server check.
  useEffect(() => {
    if (currentUser && currentUser.role !== 'guest') {
      router.push('/home');
    }
  }, [currentUser, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    
    startTransition(async () => {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
        const idToken = await userCredential.user.getIdToken();

        // Create the session cookie
        const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken }),
        });

        if (response.ok) {
            // On successful session creation, redirect to the home page.
            // The AuthProvider will pick up the new session and update the context.
            router.push('/home');
        } else {
            const errorData = await response.json();
            setError(errorData.error || 'Failed to create session.');
        }
        
      } catch (error: unknown) {
        if ((error as { code?: string }).code === 'auth/invalid-credential') {
            setError("Invalid email or password. Please try again.");
        } else {
            if (error instanceof Error) {
                setError(error.message);
            } else {
                setError("An unexpected error occurred during login.");
            }
        }
      }
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card text-card-foreground rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Sign In</h1>
          <p className="text-muted-foreground">to continue to Open for Product</p>
        </div>

        {error && (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Heads up!</AlertTitle>
                <AlertDescription>
                    {error}
                </AlertDescription>
            </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your@email.com" {...field} disabled={isPending}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isPending}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
          <p className="mt-2">
            Or,{' '}
            <Link href="/home" className="font-semibold text-primary hover:underline">
              take a peek
            </Link>
            {' '}
            at what people are building.
            </p>
        </div>

      </div>
    </div>
  );
}
