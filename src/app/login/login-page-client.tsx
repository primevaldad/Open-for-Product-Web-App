
'use client';

import { useState, useTransition, useEffect, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";

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

function LoginForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/home';
  const { currentUser } = useAuth(); // Use auth context
  const { toast } = useToast();

  // If the AuthProvider determines there's a user, redirect to home.
  // This handles the client-side check after the initial server check.
  useEffect(() => {
    if (currentUser && currentUser.role !== 'guest') {
      // Use window.location.href to bypass Next.js aggressive router cache
      // which caches redirects and causes infinite loops.
      window.location.href = redirectTo;
    }
  }, [currentUser, redirectTo]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const [isResetting, setIsResetting] = useState(false);

  const handleResetPassword = async () => {
    const email = form.getValues('email');
    if (!email) {
      form.setError('email', { type: 'manual', message: 'Please enter your email address first to reset your password.' });
      // Use setTimeout to ensure the error message is visible if we want to focus, or just return
      return;
    }

    setIsResetting(true);
    setError(null);
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Password reset email sent",
        description: "Check your inbox for a link to reset your password.",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      if (error.code === 'auth/user-not-found') {
         setError("No user found with this email address.");
      } else {
         setError(error.message || "Failed to send password reset email. Please try again.");
      }
    } finally {
      setIsResetting(false);
    }
  };

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

        const result = await response.json();

        if (result.success || result.status === 'success') {
            // Use window.location.href for a hard refresh to ensure the session is picked up
            window.location.href = redirectTo;
        } else if (result.requiresSignup) {
            // Redirect to signup if Firestore doc is missing, pre-filling email
            toast({
                title: "Profile setup required",
                description: "You have an account, but we need a few more details to set up your profile."
            });
            const signupUrl = `/signup?email=${encodeURIComponent(result.email || '')}&redirectTo=${encodeURIComponent(redirectTo)}`;
            router.push(signupUrl);
        } else {
            setError(result.error || 'Failed to create session.');
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
                    <Input placeholder="your@email.com" {...field} disabled={isPending || isResetting}/>
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
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <button 
                      type="button" 
                      onClick={handleResetPassword} 
                      disabled={isPending || isResetting}
                      className="text-sm text-primary hover:underline disabled:opacity-50"
                    >
                      {isResetting ? "Sending..." : "Forgot password?"}
                    </button>
                  </div>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isPending || isResetting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending || isResetting}>
              {isPending ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account?{' '}
            <Link href={`/signup?redirectTo=${encodeURIComponent(redirectTo)}`} className="font-semibold text-primary hover:underline">
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

export default function LoginPageClient() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
