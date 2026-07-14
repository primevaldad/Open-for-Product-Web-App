import { Metadata } from 'next';
import CreateProjectPageClient from './create-client-page';

export const metadata: Metadata = {
  title: 'Create Project | Open for Product',
};

export default function CreateProjectPage() {
  return <CreateProjectPageClient />;
}
