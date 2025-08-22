import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { format } from "date-fns";
import { MoreHorizontal, Check, Edit, Trash2, Flag, Calendar } from "lucide-react";
import { useTaskSelection } from "../contexts/TaskSelectionContext";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Task {
    _id: Id<"tasks">;
    _creationTime: number;
    userId: string;
    projectId?: Id<"projects">;
    title: string;
    notes?: string;
    priority: number;
    due?: number;
    completedAt?: number;
    deletedAt?: number;
    sort: number;
    labelIds: Id<"labels">[];
    createdAt: number;
    updatedAt: number;
}

interface TaskItemProps {
    task: Task;
}

export default function TaskItem({ task }: TaskItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const deleteButtonRef = useRef<HTMLButtonElement>(null);

    const [isCompleting, setIsCompleting] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Focus the delete button when dialog opens
    useEffect(() => {
        if (showDeleteDialog) {
            // Use a longer delay to ensure the dialog is fully rendered and mounted
            const timer = setTimeout(() => {
                if (deleteButtonRef.current) {
                    deleteButtonRef.current.focus();
                    console.log('Attempted to focus delete button');
                } else {
                    console.log('Delete button ref not found');
                }
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [showDeleteDialog]);

    const projects = useQuery(api.projects.list);
    const labels = useQuery(api.labels.list);
    const toggleComplete = useMutation(api.tasks.toggleComplete);
    const updateTask = useMutation(api.tasks.update);
    const removeTask = useMutation(api.tasks.remove);

    const { openDetailsPanel } = useTaskSelection();

    const project = projects?.find(p => p._id === task.projectId);
    const taskLabels = labels?.filter(l => task.labelIds.includes(l._id)) || [];

    const handleToggleComplete = async () => {
        // If already completed, just toggle immediately
        if (task.completedAt) {
            void toggleComplete({ taskId: task._id }).catch((error) => {
                console.error("Failed to toggle task completion:", error);
            });
            return;
        }

        // For completing tasks, show animation sequence
        setIsCompleting(true);

        // Wait for checkbox animation to complete
        setTimeout(() => {
            void (async () => {
                try {
                    // Actually complete the task
                    await toggleComplete({ taskId: task._id });

                    // Start removal animation after a brief pause to see the completion
                    setTimeout(() => {
                        setIsRemoving(true);
                    }, 200);
                } catch (error) {
                    console.error("Failed to toggle task completion:", error);
                    setIsCompleting(false);
                }
            })();
        }, 300); // Checkbox animation duration
    };

    const handleSaveEdit = async () => {
        if (editTitle.trim() === task.title) {
            setIsEditing(false);
            return;
        }

        void updateTask({
            taskId: task._id,
            title: editTitle.trim(),
        }).then(() => {
            setIsEditing(false);
        }).catch((error) => {
            console.error("Failed to update task:", error);
            setEditTitle(task.title);
        });
    };

    const handleDelete = async () => {
        setShowDeleteDialog(true);
    };

    const confirmDelete = async () => {
        void removeTask({ taskId: task._id }).catch((error) => {
            console.error("Failed to delete task:", error);
        });
        setShowDeleteDialog(false);
    };



    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            void handleSaveEdit();
        } else if (e.key === "Escape") {
            setEditTitle(task.title);
            setIsEditing(false);
        }
    };

    const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "d" || e.key === "D") {
            e.preventDefault();
            e.stopPropagation();
            // Delete directly without confirmation
            void removeTask({ taskId: task._id }).catch((error) => {
                console.error("Failed to delete task:", error);
            });
            setIsDropdownOpen(false);
        }
    };

    const formatDueDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Tomorrow";
        if (diffDays === -1) return "Yesterday";
        if (diffDays > 1 && diffDays <= 7) return date.toLocaleDateString("en-US", { weekday: "long" });

        // Format like "27 Jun", "2 Jul 7 PM", etc.
        const day = date.getDate();
        const month = format(date, "MMM");
        const hours = date.getHours();
        const minutes = date.getMinutes();

        if (hours === 0 && minutes === 0) {
            return `${day} ${month}`;
        } else {
            const timeStr = format(date, "h:mm a");
            return `${day} ${month} ${timeStr}`;
        }
    };



    // Don't render completed tasks unless they're in the animation sequence
    if (task.completedAt && !isCompleting && !isRemoving) {
        return null;
    }

    return (
        <>
            <div
                className={cn(
                    "flex cursor-pointer items-start space-x-3 border-b border-gray-800 py-4 transition-all duration-500 ease-in-out",
                    isRemoving && "opacity-0 -translate-x-4 scale-95"
                )}

                onClick={(e) => {
                    // Prevent interaction during completion animation
                    if (isCompleting || isRemoving) return;

                    // If Opt/Alt + Click, enable editing mode
                    if (e.altKey) {
                        setIsEditing(true);
                    }
                    // If double-click, enable editing mode
                    else if (e.detail === 2) {
                        setIsEditing(true);
                    } else {
                        // Single click opens details panel
                        openDetailsPanel(task);
                    }
                }}
            >
                {/* Checkbox */}
                <div className="relative">
                    <Checkbox
                        checked={!!task.completedAt || isCompleting}
                        onCheckedChange={() => {
                            // Disable interaction during animations
                            if (isCompleting || isRemoving) return;
                            void handleToggleComplete();
                        }}
                        disabled={isCompleting || isRemoving}
                        className={cn(
                            "w-6 h-6 rounded-full border-2 transition-all duration-300",
                            isCompleting && "scale-110 bg-green-500 border-green-500",
                            (isCompleting || isRemoving) && "pointer-events-none"
                        )}
                    />
                    {isCompleting && (
                        <>
                            <div className="absolute inset-0 rounded-full bg-green-500 opacity-20 animate-ping" />
                            <Check className="absolute inset-0 w-4 h-4 text-white m-auto animate-bounce" />
                        </>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    {/* Title */}
                    {isEditing ? (
                        <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={() => void handleSaveEdit()}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            className="h-8"
                        />
                    ) : (
                        <div
                            className={cn(
                                "text-sm cursor-pointer hover:text-primary transition-all duration-300",
                                (task.completedAt || isCompleting) && "line-through text-muted-foreground",
                                isCompleting && "opacity-75"
                            )}
                        >
                            {task.title}
                        </div>
                    )}

                    {/* Notes */}
                    {task.notes && (
                        <div className="text-sm text-muted-foreground">
                            {task.notes}
                        </div>
                    )}

                    {/* Metadata as Text */}
                    <div className="flex items-center space-x-4 mt-2 text-xs">
                        {/* Due Date */}
                        {task.due && (
                            <span className="flex items-center text-red-400">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDueDate(task.due)}
                            </span>
                        )}

                        {/* Priority */}
                        <span className={cn(
                            "flex items-center",
                            task.priority === 1 && "text-red-400",
                            task.priority === 2 && "text-orange-400",
                            task.priority === 3 && "text-blue-400",
                            task.priority === 4 && "text-gray-400"
                        )}>
                            <Flag className="h-3 w-3 mr-1" />
                            Priority {task.priority}
                        </span>

                        {/* Project */}
                        {project && (
                            <span className="flex items-center text-muted-foreground">
                                {project.name}
                            </span>
                        )}

                        {/* Labels */}
                        {taskLabels.map((label) => (
                            <span key={label._id} className="flex items-center text-muted-foreground">
                                {label.name}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Right side: Menu only */}
                <div className="flex items-center">
                    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-24"
                            onKeyDown={handleDropdownKeyDown}
                        >
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsEditing(true);
                                }}
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    void handleDelete();
                                }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete <span className="text-muted-foreground">D</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent onOpenAutoFocus={(e) => {
                    e.preventDefault();
                    // Focus the delete button instead of the first focusable element
                    setTimeout(() => {
                        deleteButtonRef.current?.focus();
                    }, 0);
                }}>
                    <DialogHeader>
                        <DialogTitle>Delete Task</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{task.title}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            ref={deleteButtonRef}
                            variant="destructive"
                            onClick={() => void confirmDelete()}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
