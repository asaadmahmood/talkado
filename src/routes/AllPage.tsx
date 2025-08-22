import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CheckSquare, AlertCircle, Calendar, Clock, Inbox } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import TaskItem from "../components/TaskItem";
import SectionHeader from "../components/SectionHeader";
import PageHeader from "../components/PageHeader";

export default function AllPage() {
    const tasks = useQuery(api.tasks.listAll);

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
