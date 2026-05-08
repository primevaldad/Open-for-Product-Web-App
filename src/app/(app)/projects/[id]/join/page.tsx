import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/session.server';
import { findProjectById, adminDb } from '@/lib/data.server';
import { deepSerialize } from '@/lib/utils.server';
import { ProjectInvite } from '@/lib/types';
import JoinClient from './JoinClient';
import { Timestamp } from 'firebase-admin/firestore';

export default async function JoinPage({
    params,
    searchParams
}: {
    params: { id: string };
    searchParams: { token?: string };
}) {
    const { id } = params;
    const { token } = searchParams;

    if (!token) {
        return <div className="p-8 text-center text-red-500 font-semibold">Invalid invitation link.</div>;
    }

    // Verify token exists and is valid
    const inviteQuery = await adminDb.collection('projectInvites').where('token', '==', token).limit(1).get();
    if (inviteQuery.empty) {
        return <div className="p-8 text-center text-red-500 font-semibold mt-10">Invalid or missing invitation token.</div>;
    }

    const inviteData = inviteQuery.docs[0].data() as ProjectInvite;
    
    // Convert expiresAt to Date object safely
    const expiresAt = (inviteData.expiresAt as unknown as Timestamp)?.toDate?.() || new Date(inviteData.expiresAt as string);
    const isExpired = new Date() > expiresAt;

    if (isExpired || inviteData.status === 'expired') {
        return <div className="p-8 text-center text-amber-500 font-semibold text-lg mt-10">This invitation has expired.</div>;
    }

    if (inviteData.status === 'cancelled') {
        return <div className="p-8 text-center text-red-500 font-semibold text-lg mt-10">This invitation was cancelled by the project lead.</div>;
    }

    if (inviteData.status === 'accepted') {
        return <div className="p-8 text-center text-green-500 font-semibold mt-10">This invitation has already been accepted.</div>;
    }

    if (inviteData.status === 'declined') {
        return <div className="p-8 text-center text-red-500 font-semibold mt-10">This invitation was declined.</div>;
    }

    const currentUser = await getAuthenticatedUser();

    // If logged in but emails don't match
    if (currentUser && currentUser.email !== inviteData.email) {
        return <div className="p-8 text-center text-red-500 font-semibold mt-10">This invitation is for a different email address ({inviteData.email}). Please log in with the correct account.</div>;
    }

    const project = await findProjectById(id, currentUser);
    if (!project) {
        return <div className="p-8 text-center text-red-500 font-semibold mt-10">Project not found.</div>;
    }

    return (
        <div className="container max-w-lg mx-auto py-16">
            <JoinClient project={deepSerialize(project)} token={token} role={inviteData.role} isLoggedIn={!!currentUser} />
        </div>
    );
}
