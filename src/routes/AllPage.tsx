import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CheckSquare, AlertCircle, Calendar, Clock, Inbox } from "lucide-react";
import { useEffect } from "react";
import { useTaskSelection } from "../contexts/TaskSelectionContext";

import { Card, CardContent } from "@/components/ui/card";
import TaskItem from "../components/TaskItem";
import SectionHeader from "../components/SectionHeader";
import PageHeader from "../components/PageHeader";

export default function AllPage() {
    const tasks = useQuery(api.tasks.listAll);
    const { openDetailsPanel } = useTaskSelection();

    // Check if there's a task to open when the page loads
    useEffect(() => {
        const taskIdToOpen = sessionStorage.getItem('openTaskId');
        console.log('AllPage: Checking for task to open:', taskIdToOpen);
        console.log('AllPage: Available tasks:', tasks?.map(t => ({ id: t._id, title: t.title })));

        if (taskIdToOpen && tasks) {
            const taskToOpen = tasks.find(task => task._id === taskIdToOpen);
            console.log('AllPage: Found task to open:', taskToOpen);

            if (taskToOpen) {
                console.log('AllPage: Opening task details for:', taskToOpen.title);
                openDetailsPanel(taskToOpen);
                sessionStorage.removeItem('openTaskId');
            } else {
                console.log('AllPage: Task not found in tasks list');
            }
        }
    }, [tasks, openDetailsPanel]);

    // Listen for custom event when staying on the same page
    useEffect(() => {
        const handleOpenTask = (event: CustomEvent) => {
            const { taskId } = event.detail;
            console.log('AllPage: Received openTask event for taskId:', taskId);

            if (tasks) {
                const taskToOpen = tasks.find(task => task._id === taskId);
                if (taskToOpen) {
                    console.log('AllPage: Opening task details for:', taskToOpen.title);
                    openDetailsPanel(taskToOpen);
                }
            }
        };

        window.addEventListener('openTask', handleOpenTask as EventListener);

        return () => {
            window.removeEventListener('openTask', handleOpenTask as EventListener);
        };
    }, [tasks, openDetailsPanel]);

    if (tasks === undefined) {
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

    // Group tasks by categories for better organization
    const incompleteTasks = tasks.filter(task => !task.completedAt);

    // Get today's date range (start and end of today)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

    // Categorize tasks (each task should only appear in one category)
    const overdueTasks = incompleteTasks.filter(task =>
        task.due && task.due < todayStart
    );
    const todayTasks = incompleteTasks.filter(task =>
        task.due && task.due >= todayStart && task.due <= todayEnd
    );
    const upcomingTasks = incompleteTasks.filter(task =>
        task.due && task.due > todayEnd
    );
    const noDateTasks = incompleteTasks.filter(task => !task.due);

    const TaskSection = ({
        title,
        tasks,
        icon,
        variant = "default"
    }: {
        title: string;
        tasks: typeof incompleteTasks;
        icon: React.ComponentType<{ className?: string }>;
        variant?: "default" | "destructive" | "secondary" | "outline";
    }) => {
        if (tasks.length === 0) return null;

        return (
            <div className="space-y-3">
                <SectionHeader
                    title={title}
                    count={tasks.length}
                    icon={icon}
                    variant={variant}
                />
                <div>
                    {tasks.map((task) => (
                        <TaskItem key={task._id} task={task} />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="">
                {/* Header */}
                <PageHeader
                    title="All Tasks"
                    taskCount={incompleteTasks.length}
                    icon={CheckSquare}
                />

                <div className="p-6">
                    {incompleteTasks.length === 0 ? (
                        <Card>
                            <CardContent className="text-center py-12">
                                <div className="text-6xl mb-4">✨</div>
                                <h3 className="text-lg font-medium mb-2">
                                    Nothing to do!
                                </h3>
                                <p className="text-muted-foreground">
                                    All your tasks are complete. Time to create some new ones!
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-8">
                            <TaskSection
                                title="Overdue"
                                tasks={overdueTasks}
                                icon={AlertCircle}
                                variant="destructive"
                            />
                            <TaskSection
                                title="Today"
                                tasks={todayTasks}
                                icon={Calendar}
                                variant="default"
                            />
                            <TaskSection
                                title="Upcoming"
                                tasks={upcomingTasks}
                                icon={Clock}
                                variant="secondary"
                            />
                            <TaskSection
                                title="No Due Date"
                                tasks={noDateTasks}
                                icon={Inbox}
                                variant="outline"
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
