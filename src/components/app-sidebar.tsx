
'use client';

import {
  Activity,
  BookOpen,
  FilePlus2,
  FolderKanban,
  Home,
  Settings,
  Library,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@/lib/types";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

interface AppSidebarProps {
    user: User;
}

export function AppSidebar({ user }: AppSidebarProps) {
    const pathname = usePathname();
    const { setOpenMobile } = useSidebar();

    const menuItems = [
        { href: "/home", icon: <Home />, label: "Home" },
        { href: "/create", icon: <FilePlus2 />, label: "Create Project" },
        { href: "/drafts", icon: <FolderKanban />, label: "Drafts" },
        { href: "/learning", icon: <BookOpen />, label: "Learning Paths" },
        { href: "/resources", icon: <Library />, label: "Free Resources" },
        { href: "/activity", icon: <Activity />, label: "Activity" },
    ];

    return (
        <Sidebar className="border-r" collapsible="icon">
            <SidebarHeader className="px-4 py-2">
                <Link href="/home" className="flex items-center gap-3">
                    <Logo />
                    <span className="text-lg font-semibold text-sidebar-foreground">Open for Product</span>
                </Link>
            </SidebarHeader>
            <SidebarContent className="p-4 pt-0">
                <SidebarMenu>
                    {menuItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                            <Link href={item.href} onClick={() => setOpenMobile(false)}>
                                <SidebarMenuButton isActive={pathname === item.href}>
                                    {item.icon}
                                    {item.label}
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                    ))}
                    <SidebarMenuItem>
                        <Link href={`/profile/${user.id}`} onClick={() => setOpenMobile(false)}>
                            <SidebarMenuButton isActive={pathname.startsWith('/profile')}>
                                <Avatar className="size-5">
                                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                                    <AvatarFallback>
                                        {user.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
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
