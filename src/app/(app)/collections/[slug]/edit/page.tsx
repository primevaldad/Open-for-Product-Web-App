import { Metadata } from 'next';
import { getCollectionBySlug } from '@/app/actions/collections';
import EditCollectionPageClient from './edit-collection-client-page';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const result = await getCollectionBySlug(params.slug);
    if (!result.success || !result.data) {
        return { title: 'Collection Not Found | Open for Product' };
    }
    return {
        title: `Edit Collection - ${result.data.name} | Open for Product`,
    };
}

export default async function EditCollectionPage({ params }: { params: { slug: string } }) {
    return <EditCollectionPageClient slug={params.slug} />;
}
