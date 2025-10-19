
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

import ProjectHeader from '@/components/project-header';
import TaskBoard from '@/components/task-board';
import DiscussionForum from '@/components/discussion-forum';
import ProjectTeam from '@/components/project-team';
import EditTaskDialog from '@/components/edit-task-dialog';
import { Button } from '@/components/ui/button';
import Markdown from '@/components/ui/markdown';

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
type AddDiscussionCommentAction = (data: { projectId: string; userId: string; content: string }) => Promise<ServerActionResponse<Discussion>>;
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

    // --- State Management ---
    const [project, setProject] = useState(initialProject);
    const [discussions, setDiscussions] = useState(initialDiscussions);
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
        if (!currentUser) return toast.error("You must be logged in to comment.");

        const result = await addDiscussionComment({ projectId: project.id, userId: currentUser.id, content });
        if (result.success) {
            toast.success("Comment posted!");
            if (result.data) {
                // Hydrate comment with current user for immediate UI update
                const newComment = { ...result.data, user: currentUser };
                setDiscussions(prev => [newComment, ...prev]);
            }
        } else {
            toast.error(`Error posting comment: ${result.error}`);
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
        
        // The action expects a specific payload, so we construct it carefully
        const payload = isUpdating ? taskData as Task : { ...taskData, projectId: project.id };

        // @ts-ignore - The dynamic action type is correct but TS struggles here.
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
                    </TabList>

                    <TabPanel>
                        <div className="py-4">
                            <Markdown content={project.description} />
                        </div>
                    </TabPanel>
                    <TabPanel>
                        <div className="flex justify-end my-4">
                            {isMember && <Button onClick={() => handleOpenTaskDialog()}>Add Task</Button>}
                        </div>
                        <TaskBoard 
                            tasks={tasks} 
                            onEditTask={handleOpenTaskDialog}
                            onDeleteTask={handleDeleteTask}
                        />
                    </TabPanel>
                    <TabPanel>
                        <DiscussionForum 
                            discussions={discussions} 
                            onAddComment={handleAddComment} 
                            isMember={isMember}
                            currentUser={currentUser}
                        />
                    </TabPanel>
                    <TabPanel>
                        <ProjectTeam 
                            team={project.team} 
                            users={users}
                            currentUser={currentUser}
                            addTeamMember={handleAddTeamMember}
                            isLead={project.team.some(m => m.userId === currentUser?.id && m.role === 'lead')}
                        />
                    </TabPanel>
                    <TabPanel>
                        {/* Learning Paths Content Here */}
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
