
import { getAuthenticatedUser } from "@/lib/session.server";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import SettingsForm from "./settings-form";
import { updateUserSettings } from "@/app/actions/users";
import { getAllTags } from "@/lib/data.server";
import type { Tag, User } from "@/lib/types";

const toDate = (timestamp: string | undefined): Date | undefined => {
    return timestamp ? new Date(timestamp) : undefined;
};

export default async function SettingsPage() {
    const user = await getAuthenticatedUser();
    if (!user) {
        redirect("/login");
    }

    // Convert server timestamps to Date objects for the form
    const safeUser: User = {
        ...user,
        createdAt: toDate(user.createdAt)?.toISOString(),
        lastLogin: toDate(user.lastLogin)?.toISOString(),
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Settings</h3>
                <p className="text-sm text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>
            <Separator />
            <SettingsForm 
                currentUser={safeUser} 
                updateUserSettings={updateUserSettings} 
            />
        </div>
    );
}
