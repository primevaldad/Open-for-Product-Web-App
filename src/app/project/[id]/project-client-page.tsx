
'use client';

import { useState } from 'react';
import { Home, LayoutPanelLeft, FilePlus2, FolderKanban, BookOpen, Activity, Settings, Users, MessageSquare, ChevronDown, ChevronRight, Pen, Trash2, Calendar, Clock, Sparkles, CheckCircle, GripVertical } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { UserNav } from '@/components/user-nav';
import { getInitials } from '@/lib/utils';
import { Sidebar, SidebarContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import type { Project, User } from '@/lib/types';
import { projectCategories } from '@/lib/static-data';


interface ProjectPageClientProps {
    project: Project;
    currentUser: User;
}

export default function ProjectPageClient({ project, currentUser }: ProjectPageClientProps) {
    const [isEditing, setIsEditing] = useState(false);
    const CategoryIcon = projectCategories.find(c => c.name === project.category)?.icon ?? Users;

    return (
        <div className="flex h-full min-h-screen w-full bg-background">
            <Sidebar className="border-r">
                <SidebarHeader className="p-4">
                    <Link href="/" className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="shrink-0 bg-primary/20 text-primary hover:bg-primary/30">
                            <LayoutPanelLeft className="h-5 w-5" />
                        </Button>
                        <span className="text-lg font-semibold text-foreground">Open for Product</span>
                    </Link>
                </SidebarHeader>
                <SidebarContent className="p-4 pt-0">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <Link href="/">
                                <SidebarMenuButton>
                                    <Home />
                                    Home
                                </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                        {/* Add other sidebar items here */}
                    </SidebarMenu>
                </SidebarContent>
            </Sidebar>
            <SidebarInset className="flex flex-col">
                <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-sm md:px-6">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" asChild>
                            <Link href="/">
                                <ChevronRight className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h1 className="text-lg font-semibold md:text-xl">
                            {project.name}
                        </h1>
                    </div>
                    <UserNav currentUser={currentUser} />
                </header>

                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-2xl font-bold">{project.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="icon" onClick={() => setIsEditing(!isEditing)}>
                                                <Pen className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="icon">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardDescription>{project.tagline}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isEditing ? (
                                        <Textarea defaultValue={project.description} className="min-h-[200px]" />
                                    ) : (
                                        <p className="text-muted-foreground">{project.description}</p>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    {isEditing && <Button>Save Changes</Button>}
                                </CardFooter>
                            </Card>

                            {/* Discussion Section */}
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle>Discussion</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Map through discussions */}
                                </CardContent>
                                <CardFooter>
                                    <div className="flex w-full gap-2">
                                        <Textarea placeholder="Add a comment..." />
                                        <Button>Send</Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>

                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Project Details</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Status</span>
                                        <Badge variant={project.status === 'completed' ? 'success' : 'default'}>{project.status}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Category</span>
                                        <span className="flex items-center"><CategoryIcon className="mr-1 h-4 w-4" />{project.category}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Timeline</span>
                                        <span className="flex items-center"><Calendar className="mr-1 h-4 w-4" />{new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Progress</span>
                                        <Progress value={project.progress} className="mt-1" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle>Team</CardTitle>
                                </CardHeader>
                                <CardContent className="grid gap-4">
                                    {project.team.map(member => (
                                        <div key={member.user.id} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={member.user.avatarUrl} />
                                                    <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">{member.user.name}</p>
                                                    <p className="text-sm text-muted-foreground">{member.role}</p>
                                                </div>
                                            </div>
                                            <Button variant="outline" size="icon">
                                                <MessageSquare className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                        </div>
                    </div>
                </main>
            </SidebarInset>
        </div>
    );
}
