import { Metadata } from 'next';
import LearningClientPage from './learning-client-page';

export const metadata: Metadata = {
  title: 'Learning | Open for Product',
};

export default function LearningPage() {
  return <LearningClientPage />;
}
