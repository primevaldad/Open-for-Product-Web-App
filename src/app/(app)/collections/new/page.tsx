import { Metadata } from 'next';
import NewCollectionClientPage from './new-collection-client-page';

export const metadata: Metadata = {
  title: 'New Collection | Open for Product',
};

export default function NewCollectionPage() {
  return <NewCollectionClientPage />;
}
