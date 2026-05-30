import { Metadata } from 'next';
import { getPlatformConfigAction } from '@/app/actions/admin';
import { getAuthenticatedUser } from '@/lib/session.server';
import { redirect } from 'next/navigation';
import AdminClientPage from './admin-client-page';
import { PlatformConfig } from '@/lib/types';

export const metadata: Metadata = {
    title: 'Platform Admin | Open for Product',
};

export default async function AdminPage() {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) redirect('/login');

    const result = await getPlatformConfigAction();
    if (!result.success || !result.data) {
        return <div className="p-8">Error loading platform config: {result.error}</div>;
    }

    const config = result.data;

    // Optional: enforce admin only view
    if (config.adminUserIds && config.adminUserIds.length > 0 && !config.adminUserIds.includes(currentUser.id)) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Unauthorized</h1>
                    <p className="text-muted-foreground">You are not a platform admin.</p>
                </div>
            </div>
        );
    }

    return <AdminClientPage initialConfig={config} currentUserId={currentUser.id} />;
}
