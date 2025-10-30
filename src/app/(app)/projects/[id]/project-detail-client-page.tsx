
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { LockKeyhole } from 'lucide-react';

import ProjectHeader from '@/components/project-header';
import TaskBoard from '@/components/task-board';
import DiscussionForum from '@/components/discussion-forum';
import ProjectTeam from '@/components/project-team';
import EditTaskDialog from '@/components/edit-task-dialog';
import { Button } from '@/components/ui/button';
import Markdown from '@/components/ui/markdown';
import ProjectGovernance from '@/components/project-governance';

import type { 
    HydratedProject, 
    Discussion, 
    Task, 
    User, 
    LearningPath, 
    ServerActionResponse, 
    HydratedProjectMember,
    ProjectMember
} from '@/lib/types';
import { toDate } from '@/lib/utils';

// Action Prop Types
type JoinProjectAction = (projectId: string) => Promise<ServerActionResponse<HydratedProjectMember>>;
type AddTeamMemberAction = (data: { projectId: string; userId: string; role: ProjectMember['role'] }) => Promise<ServerActionResponse<HydratedProjectMember>>;
type AddDiscussionCommentAction = (data: { projectId: string; content: string }) => Promise<ServerActionResponse<Discussion>>;
type AddTaskAction = (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ServerActionResponse<Task>>;
type UpdateTaskAction = (data: Task) => Promise<ServerActionResponse<Task>>;
type DeleteTaskAction = (data: { id: string; projectId: string }) => Promise<ServerActionResponse<{}>>;

export interface ProjectDetailClientPageProps {
    project: HydratedProject;
    discussions: (Discussion & { user?: User })[];
    tasks: Task[];
    users: User[];
    currentUser: User | null;
    learningPaths: LearningPath[];
    joinProject: JoinProjectAction;
    addTeamMember: AddTeamMemberAction;
    addDiscussionComment: AddDiscussionCommentAction;
    addTask: AddTaskAction;
    updateTask: UpdateTaskAction;
    deleteTask: DeleteTaskAction;
}

// A component to block content for logged-out users.
// This is an overlay that should be placed in a container with `position: relative`.
const LoginWall = ({ message, currentPath }: { message: string, currentPath: string }) => (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/80 p-8 text-center">
        <LockKeyhole className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-semibold text-foreground">{message}</p>
        <Button asChild>
            <Link href={`/login?redirect=${encodeURIComponent(currentPath)}`}>Login to View</Link>
        </Button>
    </div>
);

export default function ProjectDetailClientPage(props: ProjectDetailClientPageProps) {
    const {
        project: initialProject,
        discussions: initialDiscussions,
        tasks: initialTasks,
        users,
        currentUser,
        learningPaths,
        joinProject,
        addTeamMember,
        addDiscussionComment,
        addTask,
        updateTask,
        deleteTask,
    } = props;

    const currentPath = usePathname();

    // --- State Management ---
    const [project, setProject] = useState(initialProject);
    const [discussions, setDiscussions] = useState(initialDiscussions.map(d => ({ ...d, createdAt: toDate(d.createdAt), updatedAt: toDate(d.updatedAt) })));
    const [tasks, setTasks] = useState(initialTasks.map(t => ({...t, createdAt: toDate(t.createdAt), updatedAt: toDate(t.updatedAt)})));
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

    const isMember = currentUser ? project.team.some(m => m.userId === currentUser.id) : false;

    // --- Action Handlers ---

    const handleJoinProject = async () => {
        if (!currentUser) return toast.error("You must be logged in to join.");
        
        const result = await joinProject(project.id);
        if (result.success) {
            toast.success("Welcome to the project!");
            if (result.data) {
                setProject(prev => ({ ...prev, team: [...prev.team, result.data!] }));
            }
        } else {
            toast.error(`Failed to join: ${result.error}`);
        }
    };

    const handleAddTeamMember = async (userId: string, role: ProjectMember['role']) => {
        const result = await addTeamMember({ projectId: project.id, userId, role });
        if (result.success) {
            toast.success("Team member added!");
            if (result.data) {
                setProject(prev => ({ ...prev, team: [...prev.team, result.data!] }));
            }
        } else {
            toast.error(`Error adding member: ${result.error}`);
        }
    };

    const handleAddComment = async (content: string) => {
        if (!currentUser) {
            toast.error("You must be logged in to comment.");
            return;
        }

        const tempId = `temp-${Date.now()}`;
        const optimisticComment = {
            id: tempId,
            projectId: project.id,
            userId: currentUser.id,
            content,
            createdAt: new Date(),
            updatedAt: new Date(),
            user: currentUser,
        };

        setDiscussions(prev => [optimisticComment, ...prev]);

        const result = await addDiscussionComment({ projectId: project.id, content });

        if (result.success && result.data) {
            const finalComment = { ...result.data, user: currentUser, createdAt: toDate(result.data.createdAt), updatedAt: toDate(result.data.updatedAt) };
            setDiscussions(prev => prev.map(d => d.id === tempId ? finalComment : d));
            toast.success("Comment posted!");
        } else {
            toast.error(`Error posting comment: ${result.error}`);
            setDiscussions(prev => prev.filter(d => d.id !== tempId));
        }
    };

    // --- Task Handling ---

    const handleOpenTaskDialog = (task?: Task) => {
        setSelectedTask(task || null);
        setIsTaskDialogOpen(true);
    };

    const handleCloseTaskDialog = () => {
        setSelectedTask(null);
        setIsTaskDialogOpen(false);
    };

    const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> | Task) => {
        const isUpdating = 'id' in taskData;
        const action = isUpdating ? updateTask : addTask;
        
        const payload = isUpdating ? taskData as Task : { ...taskData, projectId: project.id };

        // @ts-ignore
        const result = await action(payload);

        if (result.success && result.data) {
            const savedTask = { ...result.data, createdAt: toDate(result.data.createdAt), updatedAt: toDate(result.data.updatedAt) };
            setTasks(prevTasks => {
                const existingIndex = prevTasks.findIndex(t => t.id === savedTask.id);
                if (existingIndex > -1) {
                    const newTasks = [...prevTasks];
                    newTasks[existingIndex] = savedTask;
                    return newTasks;
                } else {
                    return [savedTask, ...prevTasks];
                }
            });
            toast.success(`Task ${isUpdating ? 'updated' : 'created'} successfully!`);
            handleCloseTaskDialog();
        } else {
            toast.error(`Failed to ${isUpdating ? 'update' : 'create'} task: ${result.error}`);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!window.confirm("Are you sure you want to delete this task?")) return;

        const result = await deleteTask({ id: taskId, projectId: project.id });
        if (result.success) {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            toast.success("Task deleted.");
        } else {
            toast.error(`Failed to delete task: ${result.error}`);
        }
    };
    

    return (
        <div>
            <ProjectHeader project={project} currentUser={currentUser} onJoin={handleJoinProject} />
            
            <div className="mt-8">
                <Tabs>
                    <TabList>
                        <Tab>About</Tab>
                        <Tab>Tasks</Tab>
                        <Tab>Discussion</Tab>
                        <Tab>Team</Tab>
                        <Tab>Learning Paths</Tab>
                        <Tab>Governance</Tab>
                    </TabList>

                    <TabPanel>
                        <div className="py-4 relative">
                            {currentUser ? (
                                <Markdown content={project.description} />
                            ) : (
                                <>
                                    <div className="blur-sm select-none">
                                        <Markdown content={project.description} />
                                    </div>
                                    <LoginWall message="Login to read the full project description" currentPath={currentPath} />
                                </>
                            )}
                        </div>
                    </TabPanel>
                    <TabPanel>
                        {currentUser ? (
                            <>
                                <div className="flex justify-end my-4">
                                    {isMember && <Button onClick={() => handleOpenTaskDialog()}>Add Task</Button>}
                                </div>
                                <TaskBoard 
                                    tasks={tasks} 
                                    onEditTask={handleOpenTaskDialog}
                                    onDeleteTask={handleDeleteTask}
                                />
                            </>
                        ) : (
                            <div className="py-4 relative h-60">
                                <LoginWall message="Login to view project tasks" currentPath={currentPath} />
                            </div>
                        )}
                    </TabPanel>
                    <TabPanel>
                         {currentUser ? (
                            <DiscussionForum 
                                discussions={discussions} 
                                onAddComment={handleAddComment} 
                                isMember={isMember}
                                currentUser={currentUser}
                            />
                        ) : (
                            <div className="py-4 relative h-60">
                                <LoginWall message="Login to join the discussion" currentPath={currentPath} />
                            </div>
                        )}
                    </TabPanel>
                    <TabPanel>
                         {currentUser ? (
                            <ProjectTeam 
                                team={project.team} 
                                users={users}
                                currentUser={currentUser}
                                addTeamMember={handleAddTeamMember}
                                isLead={project.team.some(m => m.userId === currentUser?.id && m.role === 'lead')}
                            />
                        ) : (
                            <div className="py-4 relative h-60">
                                <LoginWall message="Login to see the project team" currentPath={currentPath} />
                            </div>
                        )}
                    </TabPanel>
                    <TabPanel>
                        <div className="p-4">
                            <h2 className="text-xl font-bold mb-4">Recommended Learning Paths</h2>
                            {learningPaths.length > 0 ? (
                                <ul className="space-y-4">
                                    {learningPaths.map(path => (
                                        <li key={path.id} className="bg-gray-100 p-4 rounded-lg">
                                            <h3 className="font-bold text-lg">{path.name}</h3>
                                            <p className="text-gray-600">{path.description}</p>
                                            <a href={`/learning-paths/${path.id}`} className="text-blue-500 hover:underline mt-2 inline-block">View Path</a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No recommended learning paths for this project yet.</p>
                            )}
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <ProjectGovernance governance={project.governance} />
                    </TabPanel>
                </Tabs>
            </div>

            {isTaskDialogOpen && (
                <EditTaskDialog
                    isOpen={isTaskDialogOpen}
                    onClose={handleCloseTaskDialog}
                    // @ts-ignore
                    onSave={handleSaveTask}
                    task={selectedTask}
                    projectTeam={project.team}
                />
            )}
        </div>
    );
}
