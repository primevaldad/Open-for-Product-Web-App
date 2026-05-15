import { Metadata } from 'next';
import SignUpPageClient from './signup-client-page';

export const metadata: Metadata = {
  title: 'Sign Up | Open for Product',
};

export default function SignUpPage() {
  return <SignUpPageClient />;
}
