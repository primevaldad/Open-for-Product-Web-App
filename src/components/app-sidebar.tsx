
'use client';

import {
  BookOpen,
  FilePlus2,
  FolderKanban,
  Home,
  Layers,
  Settings,
  Library,
  Rss,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@/lib/types";
import { buildHybridUrl } from "@/lib/slug";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./logo";
import { UserAvatar } from "./user-avatar";

interface AppSidebarProps {
    user: User;
    hasNewCommunityContent?: boolean;
}

export function AppSidebar({ user, hasNewCommunityContent }: AppSidebarProps) {
    const pathname = usePathname();
    const { setOpenMobile } = useSidebar();

    const menuItems = [
        { href: "/home", icon: <Home />, label: "Home" },
        { href: "/create", icon: <FilePlus2 />, label: "Create Project" },
        { href: "/drafts", icon: <FolderKanban />, label: "Drafts" },
        { href: "/collections", icon: <Layers />, label: "Collections" },
        { href: "/learning", icon: <BookOpen />, label: "Learning Paths" },
        { href: "/resources", icon: <Library />, label: "Free Resources" },
        { 
            href: "/feed", 
            icon: <Rss />, 
            label: "Feed",
            showIndicator: hasNewCommunityContent 
        },
    ];

    return (
        <Sidebar className="border-r" collapsible="icon">
            <SidebarHeader className="px-4 py-2">
                <Link href="/home" className="flex items-center gap-3">
                    <Logo />
                    <span className="text-lg font-semibold text-sidebar-foreground text-nowrap">Open for Product</span>
                </Link>
            </SidebarHeader>
            <SidebarContent className="p-4 pt-0">
                <SidebarMenu>
                    {menuItems.map((item: any) => (
                        <SidebarMenuItem key={item.href}>
                            <Link href={item.href} onClick={() => setOpenMobile(false)}>
                                <SidebarMenuButton isActive={pathname === item.href} className="relative">
                                    {item.icon}
                                    {item.label}
                                    {item.showIndicator && (
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-blue-500" title="New community updates" />
                                    )}
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                        <Link href={buildHybridUrl('/profile', user.id, user.username || user.name)} onClick={() => setOpenMobile(false)}>
                            <SidebarMenuButton isActive={pathname.startsWith('/profile')}>
                                <UserAvatar user={user} className="size-5" badgeSize="sm" />
                                Profile
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <Link href="/settings" onClick={() => setOpenMobile(false)}>
                            <SidebarMenuButton isActive={pathname.startsWith('/settings')}>
                                <Settings />
                                Settings
                            </SidebarMenuButton>
                        </Link>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarContent>
        </Sidebar>
    );
}
