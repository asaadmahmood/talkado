import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Folder } from "lucide-react";
import { useEffect } from "react";
import { useTaskSelection } from "../contexts/TaskSelectionContext";
import TaskItem from "../components/TaskItem";
import PageHeader from "../components/PageHeader";

export default function ProjectPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const { openDetailsPanel } = useTaskSelection();

    const projects = useQuery(api.projects.list);
    const tasks = useQuery(
        api.tasks.listByProject,
        projectId ? { projectId: projectId as Id<"projects"> } : "skip"
    );

    // Check if there's a task to open when the page loads
    useEffect(() => {
        const taskIdToOpen = sessionStorage.getItem('openTaskId');
        if (taskIdToOpen && tasks) {
            const taskToOpen = tasks.find(task => task._id === taskIdToOpen);
            if (taskToOpen) {
                openDetailsPanel(taskToOpen);
                sessionStorage.removeItem('openTaskId');
            }
        }
    }, [tasks, openDetailsPanel]);

    // Listen for custom event when staying on the same page
    useEffect(() => {
        const handleOpenTask = (event: CustomEvent) => {
            const { taskId } = event.detail;

            if (tasks) {
                const taskToOpen = tasks.find(task => task._id === taskId);
                if (taskToOpen) {
                    openDetailsPanel(taskToOpen);
                }
            }
        };

        window.addEventListener('openTask', handleOpenTask as EventListener);

        return () => {
            window.removeEventListener('openTask', handleOpenTask as EventListener);
        };
    }, [tasks, openDetailsPanel]);

    const project = projects?.find(p => p._id === projectId);

    if (tasks === undefined || projects === undefined) {
        return (
            <div className="min-h-screen bg-background">
                <div className=" p-6">
                    <div className="flex items-center justify-center h-64">
                        <div className="text-muted-foreground">Loading...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-background">
                <div className=" p-6">
                    <div className="text-center py-12">
                        <div className="text-muted-foreground text-6xl mb-4">📁</div>
                        <h3 className="text-lg font-medium mb-2">
                            Project not found
                        </h3>
                        <p className="text-muted-foreground">
                            The project you're looking for doesn't exist or has been deleted.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const incompleteTasks = tasks.filter(task => !task.completedAt && !task.deletedAt);
    const completedTasks = tasks.filter(task => task.completedAt && !task.deletedAt);

    return (
        <div className="min-h-screen bg-background">
            <div className="">
                {/* Header */}
                <PageHeader
                    title={project.name}
                    taskCount={incompleteTasks.length}
                    icon={Folder}
                    subtitle={`${completedTasks.length} completed`}
                />

                <div className="p-6">
                    {/* Incomplete Tasks */}
                    {incompleteTasks.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-lg font-semibold mb-4">
                                Tasks ({incompleteTasks.length})
                            </h2>
                            <div className="space-y-3">
                                {incompleteTasks.map((task) => (
                                    <TaskItem key={task._id} task={task} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Completed Tasks */}
                    {completedTasks.length > 0 && (
                        <div className="mb-8">
                            <details className="group">
                                <summary className="text-lg font-semibold text-muted-foreground cursor-pointer mb-4 list-none">
                                    <div className="flex items-center">
                                        <span className="mr-2 transform transition-transform group-open:rotate-90">
                                            ▶
                                        </span>
                                        Completed ({completedTasks.length})
                                    </div>
                                </summary>
                                <div className="space-y-3 ml-6">
                                    {completedTasks.map((task) => (
                                        <TaskItem key={task._id} task={task} />
                                    ))}
                                </div>
                            </details>
                        </div>
                    )}

                    {/* Empty State */}
                    {incompleteTasks.length === 0 && completedTasks.length === 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">📝</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                No tasks yet
                            </h3>
                            <p className="text-gray-600">
                                Start by adding some tasks to this project using the quick add bar above.
                            </p>
                        </div>
                    )}

                    {/* Only completed tasks */}
                    {incompleteTasks.length === 0 && completedTasks.length > 0 && (
                        <div className="text-center py-12">
                            <div className="text-gray-400 text-6xl mb-4">🎉</div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">
                                All done!
                            </h3>
                            <p className="text-gray-600">
                                All tasks in this project are complete. Great work!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
