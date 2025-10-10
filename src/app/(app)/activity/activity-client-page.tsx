
'use client';

import Link from "next/link";
import { CheckCircle, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { EditTaskDialog } from "@/components/edit-task-dialog";
import type { ActivityClientPageProps } from "@/lib/types";

export default function ActivityClientPage({
  myTasks,
  completedModulesData,
  projects,
  updateTask,
  deleteTask,
  // Prefix with underscore to mark as intentionally unused
  _currentUser 
}: ActivityClientPageProps) {
  return (
    <>
      <Card className="mx-auto max-w-3xl md:col-span-1">
        <CardHeader>
          <CardTitle>Assigned Tasks</CardTitle>
          <CardDescription>
            Here&apos;s a list of tasks that require your attention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myTasks.length > 0 ? (
            <ul className="space-y-1">
              {myTasks.map(task => {
                const project = projects.find(p => p.id === task.projectId);
                if (!project) return null;

                return (
                  <li key={task.id}>
                    <EditTaskDialog
                      task={task}
                      isTeamMember={true}
                      projectTeam={project.team}
                      updateTask={updateTask}
                      deleteTask={deleteTask}
                      >
                      <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors">
                        <div className="flex-grow">
                          <p className="font-semibold">{task.title}</p>
                          <p className="text-sm text-muted-foreground">
                            In project:{" "}
                            <Link
                              href={`/projects/${project.id}`}
                              className="font-medium text-primary hover:underline"
                              onClick={e => e.stopPropagation()}
                            >
                              {project.name}
                            </Link>
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge
                            variant={
                              task.status === "Done"
                                ? "secondary"
                                : task.status === "In Progress"
                                ? "default"
                                : "outline"
                            }
                          >
                            {task.status}
                          </Badge>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </EditTaskDialog>
                    <Separator />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
              <p className="font-semibold">All clear!</p>
              <p className="text-sm">You have no tasks assigned to you right now.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mx-auto max-w-3xl md:col-span-1">
        <CardHeader>
          <CardTitle>Completed Modules</CardTitle>
          <CardDescription>
            A log of your recent learning achievements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedModulesData.length > 0 ? (
            <ul className="space-y-1">
              {completedModulesData.map(({ path, module }, index) => (
                <li key={`${path.pathId}-${module.moduleId}-${index}`}>
                  <div className="flex items-center gap-4 p-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-semibold">{module.title}</p>
                      <p className="text-sm text-muted-foreground">
                        From path:{" "}
                        <Link
                          href={`/learning/${path.pathId}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {path.title}
                        </Link>
                      </p>
                    </div>
                  </div>
                  <Separator />
                </li>
              ))}
            </ul>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
              <p className="font-semibold">No modules completed yet.</p>
              <p className="text-sm">Start a learning path to see your progress here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
  }
