import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { format } from "date-fns";
import {
    X,
    Calendar as CalendarIcon,
    Flag,
    MessageSquare,
    Send,
    Trash2,
    Edit2,
    Check,
    Folder
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

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

interface TaskDetailsPanelProps {
    task: Task;
    onClose: () => void;
}

export default function TaskDetailsPanel({ task: initialTask, onClose }: TaskDetailsPanelProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(initialTask.title);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editNotes, setEditNotes] = useState(initialTask.notes || "");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
    const [newComment, setNewComment] = useState("");

    // Query the latest task data for real-time updates
    const currentTask = useQuery(api.tasks.get, { taskId: initialTask._id });
    const task = currentTask || initialTask; // Fallback to initial task while loading

    const updateTask = useMutation(api.tasks.update);
    const comments = useQuery(api.comments.list, { taskId: task._id });
    const createComment = useMutation(api.comments.create);
    const removeComment = useMutation(api.comments.remove);

    const projects = useQuery(api.projects.list);
    const labels = useQuery(api.labels.list);

    const project = projects?.find(p => p._id === task.projectId);

    const priorityOptions = [
        { value: 1, label: "P1", icon: "🔴", color: "text-red-500" },
        { value: 2, label: "P2", icon: "🟡", color: "text-orange-500" },
        { value: 3, label: "P3", icon: "🔵", color: "text-blue-500" },
        { value: 4, label: "P4", icon: "⚪", color: "text-gray-500" },
    ];

    const currentPriority = priorityOptions.find(p => p.value === task.priority);

    // Update local state when task prop changes
    useEffect(() => {
        setEditTitle(task.title);
        setEditNotes(task.notes || "");
    }, [task]);

    const handleTitleSave = async () => {
        if (editTitle.trim() !== task.title) {
            await updateTask({
                taskId: task._id,
                title: editTitle.trim(),
            });
        }
        setIsEditingTitle(false);
    };

    const handleNotesSave = async () => {
        if (editNotes !== (task.notes || "")) {
            await updateTask({
                taskId: task._id,
                notes: editNotes,
            });
        }
        setIsEditingNotes(false);
    };

    const handleDateSelect = async (date: Date | undefined) => {
        await updateTask({
            taskId: task._id,
            due: date ? date.getTime() : undefined,
        });
        setShowDatePicker(false);
    };

    const handlePriorityChange = async (priority: number) => {
        await updateTask({
            taskId: task._id,
            priority,
        });
        setShowPriorityPicker(false);
    };

    const handleProjectChange = async (projectId: Id<"projects"> | null) => {
        await updateTask({
            taskId: task._id,
            projectId,
        });
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) return;

        await createComment({
            taskId: task._id,
            content: newComment.trim(),
        });
        setNewComment("");
    };

    const formatDueDate = (timestamp: number) => {
        return format(new Date(timestamp), "MMM d, yyyy");
    };

    const getDueDateVariant = (timestamp: number) => {
        const now = Date.now();
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        if (timestamp < now) return "destructive";
        if (timestamp < today.getTime()) return "secondary";
        return "default";
    };

    return (
        <div className="w-96 bg-background border-l h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Task Details</h2>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Title</label>
                    {isEditingTitle ? (
                        <div className="flex gap-3 items-center">
                            <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleTitleSave();
                                    if (e.key === "Escape") {
                                        setEditTitle(task.title);
                                        setIsEditingTitle(false);
                                    }
                                }}
                                className="flex-1"
                                autoFocus
                            />
                            <Button size="sm" onClick={handleTitleSave}>
                                <Check className="h-4 w-4" />
                            </Button>
                        </div>
                    ) : (
                        <div
                            className="p-2 border rounded hover:bg-muted/50 cursor-pointer flex items-center justify-between group"
                            onClick={() => setIsEditingTitle(true)}
                        >
                            <span className="font-medium">{task.title}</span>
                            <Edit2 className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                </div>

                {/* Project */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Project</label>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start">
                                <Folder className="h-4 w-4 mr-2" />
                                {project ? project.name : "No project"}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                            <DropdownMenuItem
                                onClick={() => handleProjectChange(null)}
                                className={!task.projectId ? "bg-muted" : ""}
                            >
                                <span className="mr-2">📋</span>
                                No project
                            </DropdownMenuItem>
                            {projects?.map((proj) => (
                                <DropdownMenuItem
                                    key={proj._id}
                                    onClick={() => handleProjectChange(proj._id)}
                                    className={task.projectId === proj._id ? "bg-muted" : ""}
                                >
                                    <Folder className="h-4 w-4 mr-2" />
                                    {proj.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Priority & Due Date */}
                <div className="grid grid-cols-2 gap-4">

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Due Date</label>
                        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                    <CalendarIcon className="h-4 w-4 mr-2" />
                                    {task.due ? formatDueDate(task.due) : "No date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={task.due ? new Date(task.due) : undefined}
                                    onSelect={handleDateSelect}
                                    initialFocus
                                />
                                <div className="p-3 border-t">
                                    <div className="flex space-x-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDateSelect(new Date())}
                                            className="text-xs"
                                        >
                                            Today
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const tomorrow = new Date();
                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                handleDateSelect(tomorrow);
                                            }}
                                            className="text-xs"
                                        >
                                            Tomorrow
                                        </Button>
                                        {task.due && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleDateSelect(undefined)}
                                                className="text-xs"
                                            >
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Priority</label>
                        <DropdownMenu open={showPriorityPicker} onOpenChange={setShowPriorityPicker}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                    <span className="mr-2">{currentPriority?.icon}</span>
                                    {currentPriority?.label}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-40">
                                {priorityOptions.map((option) => (
                                    <DropdownMenuItem
                                        key={option.value}
                                        onClick={() => handlePriorityChange(option.value)}
                                        className={task.priority === option.value ? "bg-muted" : ""}
                                    >
                                        <span className="mr-2">{option.icon}</span>
                                        {option.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Description/Notes */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    {isEditingNotes ? (
                        <Textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            onBlur={handleNotesSave}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") {
                                    setEditNotes(task.notes || "");
                                    setIsEditingNotes(false);
                                }
                            }}
                            placeholder="Add a description..."
                            className="min-h-[100px] resize-none"
                            autoFocus
                        />
                    ) : (
                        <div
                            className="p-3 border rounded min-h-[100px] hover:bg-muted/50 cursor-pointer relative group"
                            onClick={() => setIsEditingNotes(true)}
                        >
                            {task.notes ? (
                                <p className="text-sm whitespace-pre-wrap">{task.notes}</p>
                            ) : (
                                <p className="text-sm text-muted-foreground">Click to add a description...</p>
                            )}
                            <Edit2 className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2" />
                        </div>
                    )}
                </div>

                <Separator />

                {/* Comments */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <h3 className="font-medium">Comments</h3>
                        <Badge variant="secondary">{comments?.length || 0}</Badge>
                    </div>

                    {/* Add Comment */}
                    <div className="flex gap-2">
                        <Input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Add a comment..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment();
                                }
                            }}
                            className="flex-1"
                        />
                        <Button
                            size="sm"
                            onClick={handleAddComment}
                            disabled={!newComment.trim()}
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {comments?.map((comment) => (
                            <div key={comment._id} className="space-y-1 p-3 border rounded bg-muted/20">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                        {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-auto p-1 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeComment({ id: comment._id })}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                        ))}
                        {comments?.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No comments yet. Add one above!
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
