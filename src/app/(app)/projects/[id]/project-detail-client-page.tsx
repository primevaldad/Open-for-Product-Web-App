
"use client";

import {
  Users,
  Clock,
  Target,
  FileText,
  DollarSign,
  UserPlus,
  Pencil,
  PlusCircle,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from 'zod';
import ReactMarkdown from 'react-markdown';

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummarizeProgress } from "@/components/ai/summarize-progress";
import { HighlightBlockers } from "@/components/ai/highlight-blockers";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Task, TaskStatus, User, Project, Discussion, LearningPath } from "@/lib/types";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import { AddTaskDialog } from "@/components/add-task-dialog";
import { AddMemberDialog } from "@/components/add-member-dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { formatDistanceToNow } from 'date-fns';
import type { addDiscussionComment, addTeamMember, joinProject, addTask, updateTask, deleteTask } from "@/app/actions/projects";

const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('');

const DiscussionSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty."),
});

type DiscussionFormValues = z.infer<typeof DiscussionSchema>;

type HydratedDiscussion = Discussion & { user: User };

function TaskCard({ task, isTeamMember, team, updateTask, deleteTask }: { task: Task, isTeamMember: boolean, team: any[], updateTask: typeof updateTask, deleteTask: typeof deleteTask }) {
  return (
    <EditTaskDialog task={task} isTeamMember={isTeamMember} projectTeam={team} updateTask={updateTask} deleteTask={deleteTask}>
      <Card className="mb-2 bg-card/80 hover:bg-accent cursor-pointer">
        <CardContent className="p-3">
          <p className="text-sm font-medium mb-2">{task.title}</p>
          <div className="flex items-center justify-between">
            {task.assignedTo ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignedTo.avatarUrl} alt={task.assignedTo.name} />
                      <AvatarFallback>{getInitials(task.assignedTo.name)}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{task.assignedTo.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
                <div className="h-6 w-6" />
            )}
             {task.estimatedHours && (
                <Badge variant="outline" className="text-xs">
                    {task.estimatedHours}h
                </Badge>
             )}
          </div>
        </CardContent>
      </Card>
    </EditTaskDialog>
  );
}

interface ProjectDetailClientPageProps {
    project: Project;
    projectTasks: Task[];
    projectDiscussions: HydratedDiscussion[];
    recommendedLearningPaths: LearningPath[];
    currentUser: User;
    allUsers: User[];
    joinProject: typeof joinProject;
    addTeamMember: typeof addTeamMember;
    addDiscussionComment: typeof addDiscussionComment;
    addTask: typeof addTask;
    updateTask: typeof updateTask;
    deleteTask: typeof deleteTask;
}

export default function ProjectDetailClientPage({ 
    project, 
    projectTasks, 
    projectDiscussions,
    recommendedLearningPaths,
    currentUser,
    allUsers,
    joinProject,
    addTeamMember,
    addDiscussionComment,
    addTask,
    updateTask,
    deleteTask
}: ProjectDetailClientPageProps) {
  const params = useParams();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isCommentPending, startCommentTransition] = useTransition();

  const isCurrentUserMember = project.team.some(member => member.user.id === currentUser.id);
  const isCurrentUserLead = project.team.some(member => member.user.id === currentUser.id && member.role === 'lead');

  const form = useForm<DiscussionFormValues>({
    resolver: zodResolver(DiscussionSchema),
    defaultValues: {
      content: "",
    },
  });

  const handleJoinProject = () => {
    startTransition(async () => {
      if (typeof params.id !== 'string') return;
      const result = await joinProject(params.id);
      if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Welcome!', description: `You've successfully joined ${project.name}.` });
      }
    });
  };

  const handleAddComment = (values: DiscussionFormValues) => {
    startCommentTransition(async () => {
      if (typeof params.id !== 'string') return;
      const result = await addDiscussionComment({
        projectId: params.id,
        userId: currentUser.id,
        content: values.content,
      });

      if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
      } else {
        toast({ title: 'Comment added!' });
        form.reset();
      }
    });
  };

  const taskColumns: { [key in TaskStatus]: Task[] } = {
    'To Do': projectTasks.filter(t => t.status === 'To Do'),
    'In Progress': projectTasks.filter(t => t.status === 'In Progress'),
    'Done': projectTasks.filter(t => t.status === 'Done'),
  }

  const nonMemberUsers = allUsers.filter(user => !project.team.some(member => member.user.id === user.id));

  return (
    <div className="max-w-7xl mx-auto">
      <Tabs defaultValue="overview">
          <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="discussions">
                  Discussions
                  {projectDiscussions && projectDiscussions.length > 0 && <Badge className="ml-2">{projectDiscussions.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="learning">Recommended Learning</TabsTrigger>
                <TabsTrigger value="governance">Governance</TabsTrigger>
              </TabsList>
              {isCurrentUserLead && (
                  <Link href={`/projects/${project.id}/edit`}>
                      <Button variant="outline" size="sm">
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Project
                      </Button>
                  </Link>
              )}
          </div>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                  <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                  <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <div className="prose text-muted-foreground max-w-none">
                          <ReactMarkdown>{project.description}</ReactMarkdown>
                      </div>
                  </div>
                  <div className="space-y-4">
                      <div className="flex items-center"><Target className="h-5 w-5 mr-3 text-primary" /> <span>Skills Needed: {project.contributionNeeds.join(', ')}</span></div>
                      <div className="flex items-center"><Clock className="h-5 w-5 mr-3 text-primary" /> <span>Timeline: {project.timeline}</span></div>
                      <div className="flex items-center gap-4">
                          <Users className="h-5 w-5 text-primary flex-shrink-0" />
                          <div className="flex -space-x-2">
                              {project.team.map(member => (
                                <Tooltip key={member.user.id}>
                                  <TooltipTrigger asChild>
                                      <Link href={`/profile/${member.user.id}`}>
                                          <Avatar className="h-8 w-8 border-2 border-background">
                                              <AvatarImage src={member.user.avatarUrl} alt={member.user.name} />
                                              <AvatarFallback>{getInitials(member.user.name)}</AvatarFallback>
                                          </Avatar>
                                      </Link>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-semibold">{member.user.name}</p>
                                    <p className="capitalize text-muted-foreground">{member.role}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                          </div>
                          {isCurrentUserLead && (
                              <AddMemberDialog 
                                  projectId={project.id}
                                  nonMemberUsers={nonMemberUsers}
                                  addTeamMember={addTeamMember}
                              >
                                  <Button variant="outline" size="icon" className="h-8 w-8">
                                      <UserPlus className="h-4 w-4" />
                                  </Button>
                              </AddMemberDialog>
                          )}
                      </div>
                       <div className="space-y-2">
                          <div className="flex justify-between text-sm text-muted-foreground"><span>Progress</span><span>{project.progress}%</span></div>
                          <Progress value={project.progress} />
                      </div>
                  </div>
              </CardContent>
            </Card>
            <div className="grid md:grid-cols-2 gap-6">
              <SummarizeProgress project={project} />
              <HighlightBlockers tasks={projectTasks} discussions={projectDiscussions} />
            </div>
          </TabsContent>

          <TabsContent value="tasks">
              <Card>
                <CardHeader><CardTitle>Task Board</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(Object.keys(taskColumns) as TaskStatus[]).map((status) => (
                      <div key={status} className="bg-muted/50 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-semibold">{status} ({taskColumns[status].length})</h3>
                              {isCurrentUserMember && (
                                  <AddTaskDialog projectId={project.id} status={status} addTask={addTask}>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                          <PlusCircle className="h-4 w-4" />
                                      </Button>
                                  </AddTaskDialog>
                              )}
                          </div>
                          <div className="space-y-2">
                              {taskColumns[status].map(task => <TaskCard key={task.id} task={task} isTeamMember={isCurrentUserMember} team={project.team} updateTask={updateTask} deleteTask={deleteTask} />)}
                          </div>
                      </div>
                  ))}
                </Content>
              </Card>
          </TabsContent>

          <TabsContent value="discussions">
              <Card>
                  <CardHeader>
                      <CardTitle>Discussions</CardTitle>
                      <CardDescription>Ask questions, share ideas, and collaborate with the project team.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                      {isCurrentUserMember ? (
                      <Form {...form}>
                          <form onSubmit={form.handleSubmit(handleAddComment)} className="flex items-start gap-4">
                              <Avatar className="h-10 w-10 border">
                                  <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                                  <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-grow space-y-2">
                                  <FormField
                                      control={form.control}
                                      name="content"
                                      render={({ field }) => (
                                          <FormItem>
                                              <FormControl>
                                                  <Textarea {...field} placeholder="Add to the discussion..." className="min-h-[60px]" />
                                              </FormControl>
                                              <FormMessage />
                                          </FormItem>
                                      )}
                                  />
                                  <div className="flex justify-end">
                                      <Button type="submit" disabled={isCommentPending}>
                                          {isCommentPending ? "Posting..." : "Post Comment"}
                                      </Button>
                                  </div>
                              </div>
                          </form>
                      </Form>
                      ) : (
                          <div className="text-center text-muted-foreground text-sm p-4 border rounded-lg">
                              <p>You must be a member of this project to join the discussion.</p>
                          </div>
                      )}

                      <div className="space-y-4">
                         {projectDiscussions && projectDiscussions.length > 0 ? (
                              [...projectDiscussions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(b.timestamp).getTime()).map(comment => (
                              <div key={comment.id} className="flex items-start gap-4">
                                  <Avatar className="h-10 w-10 border">
                                      <AvatarImage src={comment.user.avatarUrl} alt={comment.user.name} />
                                      <AvatarFallback>{getInitials(comment.user.name)}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-grow rounded-lg border p-3">
                                      <div className="flex items-center justify-between mb-1">
                                          <p className="font-semibold">{comment.user.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                              {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true })}
                                          </p>
                                      </div>
                                      <p className="text-sm text-foreground">{comment.content}</p>
                                  </div>
                              </div>
                              ))
                         ) : (
                           <div key="no-discussions" className="text-center text-muted-foreground text-sm py-8">
                              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                              <p>No discussions yet. Be the first to start the conversation!</p>
                           </div>
                         )}
                      </div>
                  </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="learning">
            <Card>
              <CardHeader>
                <CardTitle>Recommended Learning</CardTitle>
                <CardDescription>Courses and resources to help you get up to speed on this project.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                {recommendedLearningPaths && recommendedLearningPaths.length > 0 ? (
                  recommendedLearningPaths.map(path => (
                    <Link key={path.id} href={`/learning/${path.id}`} className="block hover:bg-muted/50 rounded-lg border p-4 transition-colors">
                      <div className="flex items-start gap-4">
                          <div className="bg-primary/20 text-primary p-2 rounded-full">
                              <BookOpen className="h-5 w-5" />
                          </div>
                          <div>
                              <p className="font-semibold">{path.title}</p>
                              <p className="text-sm text-muted-foreground mt-1">{path.description}</p>
                          </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full text-center text-muted-foreground text-sm py-12">
                      <BookOpen className="h-8 w-8 mx-auto mb-2" />
                      <p>No recommended learning paths for this project yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="governance">
              <Card>
                  <CardHeader><CardTitle>Value & Governance</CardTitle><CardDescription>Transparent value distribution for all contributors.</CardDescription></CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                              <DollarSign className="h-6 w-6 text-green-500" />
                              <span className="font-medium">Contributors Share</span>
                          </div>
                          <span className="text-2xl font-bold">{project.governance?.contributorsShare ?? 75}%</span>
                      </div>
                       <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                              <Users className="h-6 w-6 text-blue-500" />
                              <span className="font-medium">Community Growth Stake</span>
                          </div>
                          <span className="text-2xl font-bold">{project.governance?.communityShare ?? 10}%</span>
                      </div>
                       <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                              <FileText className="h-6 w-6 text-purple-500" />
                              <span className="font-medium">Sustainability (Burn)</span>
                          </div>
                          <span className="text-2xl font-bold">{project.governance?.sustainabilityShare ?? 15}%</span>
                      </div>
                  </CardContent>
              </Card>
          </TabsContent>
      </Tabs>
      </div>
  )
}
