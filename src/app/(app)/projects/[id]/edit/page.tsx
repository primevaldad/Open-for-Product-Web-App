import { Metadata } from 'next';
import { findProjectById } from '@/lib/data.server';
import EditProjectPageClient from './edit-project-client-page';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const project = await findProjectById(params.id, null);
    if (!project) return { title: 'Project Not Found | Open for Product' };
    return {
        title: `Edit Project - ${project.name} | Open for Product`,
    };
}

export default function EditProjectPage() {
    return <EditProjectPageClient />;
}