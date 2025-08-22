import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronRight, Clock, Calendar } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TaskItem from "../components/TaskItem";
import PageHeader from "../components/PageHeader";

export default function TodayPage() {
    const [showOverdue, setShowOverdue] = useState(true);
    const tasks = useQuery(api.tasks.listToday, {});

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

    // Separate overdue and today's tasks
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const overdueTasks = tasks.filter(task => {
        if (!task.due) return false;
        const taskDate = new Date(task.due);
        const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
        return taskDay.getTime() < today.getTime() && !task.completedAt;
    });

    const todayTasks = tasks.filter(task => {
        if (!task.due) return !task.completedAt; // No due date = show in today
        const taskDate = new Date(task.due);
        const taskDay = new Date(taskDate.getFullYear(), taskDate.getMonth(), taskDate.getDate());
        return taskDay.getTime() >= today.getTime() && !task.completedAt;
    });

    const formatTodayDate = () => {
        const options: Intl.DateTimeFormatOptions = {
            day: 'numeric',
            month: 'short',
            weekday: 'long'
        };
        return now.toLocaleDateString('en-US', options);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="">
                {/* Header */}
                <PageHeader
                    title="Today"
                    taskCount={tasks.filter(t => !t.completedAt).length}
                    icon={Clock}
                    subtitle={`${formatTodayDate()}`}
                />

                <div className="p-6 space-y-6">
                    {/* Overdue Section */}
                    {overdueTasks.length > 0 && (
                        <div>
                            <Button
                                variant="ghost"
                                onClick={() => setShowOverdue(!showOverdue)}
                                className="h-auto p-0 mb-3 font-medium text-destructive hover:text-destructive"
                            >
                                <ChevronRight
                                    className={cn(
                                        "h-4 w-4 mr-1 transition-transform",
                                        showOverdue && "rotate-90"
                                    )}
                                />
                                <span>Overdue</span>
                                <Badge variant="destructive" className="ml-2">
                                    {overdueTasks.length}
                                </Badge>
                                <span className="text-muted-foreground text-sm ml-auto">
                                    Reschedule
                                </span>
                            </Button>

                            {showOverdue && (
                                <div>
                                    {overdueTasks.map((task) => (
                                        <TaskItem key={task._id} task={task} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Today's Tasks Section */}
                    <div>
                        <div className="flex items-center mb-4">
                            <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                            <h2 className="text-lg font-medium">
                                {formatTodayDate()} • Today
                            </h2>
                        </div>

                        {todayTasks.length === 0 ? (
                            <Card>
                                <CardContent className="text-center py-12">
                                    <div className="text-6xl mb-4">🎉</div>
                                    <h3 className="text-lg font-medium mb-2">
                                        All caught up!
                                    </h3>
                                    <p className="text-muted-foreground">
                                        No tasks due today. Great job staying on top of things!
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div>
                                {todayTasks.map((task) => (
                                    <TaskItem key={task._id} task={task} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
