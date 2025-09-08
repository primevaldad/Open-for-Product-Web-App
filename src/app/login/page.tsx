
'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation'; // Import the useRouter hook

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
import { login } from '@/app/actions/auth'; 

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long." }),
});

type FormValues = z.infer<typeof formSchema>;

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter(); // Initialize the router

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
        // 1. Sign in with Firebase on the client
        const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
        const idToken = await userCredential.user.getIdToken();

        // 2. Send the ID token to our server action
        const result = await login({ idToken });

        // 3. Handle the response from the server action
        if (result.success) {
          // 4. On success, navigate to the home page using the client-side router
          router.push('/home');
        } else {
          // If the server action returned an error, display it
          setError(result.error || 'An unknown error occurred.');
        }
      } catch (error: any) {
        // Handle Firebase client-side errors (e.g., wrong password)
        if (error.code === 'auth/invalid-credential') {
            setError("Invalid email or password. Please try again.");
        } else {
            setError(error.message || "An unexpected error occurred during login.");
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
      </div>
    </div>
  );
}
