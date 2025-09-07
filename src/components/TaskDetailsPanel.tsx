import { useState, useEffect, useMemo, useRef } from "react";
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
    Folder,
    Repeat,
    GripVertical,
    MoreHorizontal,
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
import { Switch } from "@/components/ui/switch";

interface Task {
    _id: Id<"tasks">;
    _creationTime: number;
    userId: string;
    projectId?: Id<"projects">;
    title: string;
    notes?: string;
    priority?: number;
    due?: number;
    completedAt?: number;
    deletedAt?: number;
    sort: number;
    labelIds: Id<"labels">[];
    createdAt: number;
    updatedAt: number;
    // Recurring task fields
    isRecurring?: boolean;
    recurringPattern?: string;
    recurringInterval?: number;
    recurringDayOfWeek?: number;
    recurringDayOfMonth?: number;
    recurringTime?: number;
    nextDueDate?: number;
    originalDueDate?: number;
}

interface TaskDetailsPanelProps {
    task: Task;
    onClose: () => void;
}

export default function TaskDetailsPanel({ task: initialTask, onClose }: TaskDetailsPanelProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState(initialTask.title);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showPriorityPicker, setShowPriorityPicker] = useState(false);
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editNotes, setEditNotes] = useState(initialTask.notes || "");
    const [newComment, setNewComment] = useState("");
    const [selectedRecurringPattern, setSelectedRecurringPattern] = useState<'daily' | 'weekly' | 'monthly' | null>(null);

    // Query the latest task data for real-time updates
    const currentTask = useQuery(api.tasks.get, { taskId: initialTask._id });
    const task = currentTask || initialTask; // Fallback to initial task while loading

    const updateTask = useMutation(api.tasks.update);
    const comments = useQuery(api.comments.list, { taskId: task._id });
    const createComment = useMutation(api.comments.create);
    const removeComment = useMutation(api.comments.remove);

    const projects = useQuery(api.projects.list);
    const labels = useQuery(api.labels.list);
    const subtasks = useQuery(api.subtasks.list, { taskId: task._id });
    const createSubtask = useMutation(api.subtasks.create);
    const toggleSubtask = useMutation(api.subtasks.toggleComplete);
    const updateSubtask = useMutation(api.subtasks.update);
    const removeSubtask = useMutation(api.subtasks.remove);
    const reorderSubtasks = useMutation(api.subtasks.reorder);
    const [newSubtask, setNewSubtask] = useState("");
    const [editingSubtaskId, setEditingSubtaskId] = useState<Id<"subtasks"> | null>(null);
    const [editingSubtaskText, setEditingSubtaskText] = useState("");
    const [draggingId, setDraggingId] = useState<Id<"subtasks"> | null>(null);
    const [localOrder, setLocalOrder] = useState<Array<Id<"subtasks">> | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const orderedSubtasks = useMemo(() => {
        if (!subtasks) return subtasks;
        if (!localOrder) return subtasks;
        const indexOf = (id: Id<"subtasks">) => localOrder.indexOf(id);
        return [...subtasks].sort((a, b) => indexOf(a._id) - indexOf(b._id));
    }, [subtasks, localOrder]);

    const project = projects?.find(p => p._id === task.projectId);

    const priorityOptions = [
        { value: 1, label: "P1", icon: "🔴", color: "text-red-500" },
        { value: 2, label: "P2", icon: "🟡", color: "text-yellow-500" },
        { value: 3, label: "P3", icon: "🔵", color: "text-blue-500" },
        { value: undefined, label: "No priority", icon: "⚪", color: "text-gray-500" },
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
        const newDue = date ? date.getTime() : undefined;

        if (task.isRecurring && date) {
            // If task is recurring and date is selected, update the recurring pattern with new date
            await updateTask({
                taskId: task._id,
                due: newDue,
                recurringDayOfWeek: task.recurringPattern === 'weekly' ? date.getDay() : undefined,
                recurringDayOfMonth: task.recurringPattern === 'monthly' ? date.getDate() : undefined,
                originalDueDate: newDue,
            });
        } else {
            // Regular date selection (no recurring or removing date)
            await updateTask({
                taskId: task._id,
                due: newDue,
                isRecurring: false,
                recurringPattern: undefined
            });
        }

        setShowDatePicker(false);
        setSelectedRecurringPattern(null);
    };

    const handleMakeRecurring = async (pattern: 'daily' | 'weekly' | 'monthly') => {
        // Use the existing date if available, otherwise open date picker
        if (task.due) {
            const existingDate = new Date(task.due);
            await updateTask({
                taskId: task._id,
                isRecurring: true,
                recurringPattern: pattern,
                recurringInterval: 1,
                recurringDayOfWeek: pattern === 'weekly' ? existingDate.getDay() : undefined,
                recurringDayOfMonth: pattern === 'monthly' ? existingDate.getDate() : undefined,
                originalDueDate: existingDate.getTime(),
                due: existingDate.getTime(),
            });
        } else {
            // No date selected, open date picker
            setSelectedRecurringPattern(pattern);
            setShowDatePicker(true);
        }
    };

    const handleRecurringDateSelect = async (date: Date | undefined) => {
        if (!selectedRecurringPattern) {
            // If no recurring pattern is selected, use the regular date handler
            await handleDateSelect(date);
            return;
        }

        if (!date) {
            // Remove recurring pattern but keep the date
            await updateTask({
                taskId: task._id,
                isRecurring: false,
                recurringPattern: undefined,
                recurringInterval: undefined,
                recurringDayOfWeek: undefined,
                recurringDayOfMonth: undefined,
                recurringTime: undefined,
                originalDueDate: undefined,
                // Keep the due date as is
            });
            setSelectedRecurringPattern(null);
            setShowDatePicker(false);
            return;
        }

        // Set recurring pattern with the selected date
        await updateTask({
            taskId: task._id,
            isRecurring: true,
            recurringPattern: selectedRecurringPattern,
            recurringInterval: 1,
            recurringDayOfWeek: selectedRecurringPattern === 'weekly' ? date.getDay() : undefined,
            recurringDayOfMonth: selectedRecurringPattern === 'monthly' ? date.getDate() : undefined,
            originalDueDate: date.getTime(),
            due: date.getTime(),
        });

        setSelectedRecurringPattern(null);
        setShowDatePicker(false);
    };

    const handleRemoveRecurring = async () => {
        await updateTask({
            taskId: task._id,
            isRecurring: false,
            recurringPattern: undefined,
            recurringInterval: undefined,
            recurringDayOfWeek: undefined,
            recurringDayOfMonth: undefined,
            recurringTime: undefined,
            originalDueDate: undefined,
            // Keep the due date as is
        });
    };

    const handleToggleRecurring = async (checked: boolean) => {
        if (!checked) {
            // Turn off recurring
            await handleRemoveRecurring();
        } else {
            // Turn on recurring - default to monthly
            const targetDate = task.due ? new Date(task.due) : new Date();
            await updateTask({
                taskId: task._id,
                isRecurring: true,
                recurringPattern: 'monthly',
                recurringInterval: 1,
                recurringDayOfMonth: targetDate.getDate(),
                originalDueDate: targetDate.getTime(),
                due: targetDate.getTime(),
            });
        }
    };

    const handlePriorityChange = async (priority: number | undefined) => {
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

    const getRecurringText = (task: Task) => {
        if (!task.isRecurring) return "";

        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        if (task.recurringPattern === "daily") {
            return task.recurringInterval && task.recurringInterval > 1
                ? `Every ${task.recurringInterval} days`
                : "Daily";
        } else if (task.recurringPattern === "weekly") {
            if (task.recurringDayOfWeek !== undefined) {
                return `Every ${dayNames[task.recurringDayOfWeek]}`;
            }
            return task.recurringInterval && task.recurringInterval > 1
                ? `Every ${task.recurringInterval} weeks`
                : "Weekly";
        } else if (task.recurringPattern === "monthly") {
            if (task.recurringDayOfMonth !== undefined) {
                const suffix = getDaySuffix(task.recurringDayOfMonth);
                return `Every ${task.recurringDayOfMonth}${suffix}`;
            }
            return task.recurringInterval && task.recurringInterval > 1
                ? `Every ${task.recurringInterval} months`
                : "Monthly";
        } else if (task.recurringPattern === "yearly") {
            return task.recurringInterval && task.recurringInterval > 1
                ? `Every ${task.recurringInterval} years`
                : "Yearly";
        }
        return "Recurring";
    };

    const getDaySuffix = (day: number) => {
        if (day >= 11 && day <= 13) return "th";
        switch (day % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    };

    const handleAddSubtask = async () => {
        const title = newSubtask.trim();
        if (!title) return;
        await createSubtask({ taskId: task._id, title }).catch(() => { });
        setNewSubtask("");
    };

    const startEditSubtask = (id: Id<"subtasks">, currentTitle: string) => {
        setEditingSubtaskId(id);
        setEditingSubtaskText(currentTitle);
    };

    const saveEditSubtask = async () => {
        if (!editingSubtaskId) return;
        const trimmed = editingSubtaskText.trim();
        if (trimmed.length === 0) {
            setEditingSubtaskId(null);
            setEditingSubtaskText("");
            return;
        }
        await updateSubtask({ id: editingSubtaskId, title: trimmed }).catch(() => { });
        setEditingSubtaskId(null);
        setEditingSubtaskText("");
    };

    const handleRemoveSubtask = async (id: Id<"subtasks">) => {
        await removeSubtask({ id }).catch(() => { });
    };

    const autoScrollOnDrag = (e: React.DragEvent) => {
        const container = scrollRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const threshold = 32;
        if (y < threshold) {
            container.scrollBy({ top: -12, behavior: "auto" });
        } else if (y > rect.height - threshold) {
            container.scrollBy({ top: 12, behavior: "auto" });
        }
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
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
                        <Popover open={showDatePicker} onOpenChange={(open) => {
                            // Don't close the popover if a recurring pattern is selected
                            if (!open && selectedRecurringPattern) {
                                return;
                            }
                            setShowDatePicker(open);
                        }}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start">
                                    <CalendarIcon className="h-4 w-4" />
                                    {task.due ? (
                                        <>
                                            {format(new Date(task.due), "MMM d, yyyy")}
                                            {task.isRecurring && (
                                                <Repeat className="ml-2 h-4 w-4 text-muted-foreground" />
                                            )}
                                        </>
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[320px] p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={task.due ? new Date(task.due) : undefined}
                                    onSelect={handleRecurringDateSelect}
                                    initialFocus
                                />
                                <div className="border-t p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-medium text-muted-foreground">Recurring</p>
                                        <Switch
                                            checked={task.isRecurring}
                                            onCheckedChange={handleToggleRecurring}
                                        />
                                    </div>

                                    {task.isRecurring && (
                                        <>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Button
                                                    size="sm"
                                                    variant={task.recurringPattern === 'daily' ? "default" : "outline"}
                                                    onClick={() => void handleMakeRecurring('daily')}
                                                    className="text-xs"
                                                >
                                                    <Repeat className="h-3 w-3 mr-1" />
                                                    Daily
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={task.recurringPattern === 'weekly' ? "default" : "outline"}
                                                    onClick={() => void handleMakeRecurring('weekly')}
                                                    className="text-xs"
                                                >
                                                    <Repeat className="h-3 w-3 mr-1" />
                                                    Weekly
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={task.recurringPattern === 'monthly' ? "default" : "outline"}
                                                    onClick={() => void handleMakeRecurring('monthly')}
                                                    className="text-xs"
                                                >
                                                    <Repeat className="h-3 w-3 mr-1" />
                                                    Monthly
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Removed separate recurring task indicator - now integrated into due date */}
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
                                        key={option.value ?? 'null'}
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

                {/* Subtasks */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">Subtasks</h3>
                        <span className="text-xs text-muted-foreground">{subtasks?.filter(s => !s.completedAt).length || 0}/20</span>
                    </div>

                    {/* Add Subtask */}
                    <div className="flex gap-2">
                        <Input
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            placeholder="Add a subtask..."
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleAddSubtask();
                                }
                            }}
                            className="flex-1"
                        />
                        <Button size="sm" onClick={() => void handleAddSubtask()} disabled={!newSubtask.trim()}>
                            Add
                        </Button>
                    </div>

                    {/* Subtasks list */}
                    <div className="space-y-2">
                        {orderedSubtasks?.map((s, idx) => (
                            <div
                                key={s._id}
                                className={cn(
                                    "flex items-center gap-2 group transition-transform",
                                    draggingId === s._id && "opacity-70 scale-[0.995] bg-muted/30 rounded"
                                )}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    e.dataTransfer.dropEffect = "move";
                                    autoScrollOnDrag(e);
                                    if (!orderedSubtasks || !draggingId || draggingId === s._id) return;
                                    const ids = (localOrder ?? orderedSubtasks.map((x) => x._id)).slice();
                                    const from = ids.indexOf(draggingId);
                                    const to = ids.indexOf(s._id);
                                    if (from === -1 || to === -1 || from === to) return;
                                    ids.splice(to, 0, ids.splice(from, 1)[0]);
                                    setLocalOrder(ids);
                                }}
                                onDrop={async (e) => {
                                    e.preventDefault();
                                    if (!orderedSubtasks || !draggingId || draggingId === s._id) return;
                                    const ids = (localOrder ?? orderedSubtasks.map((x) => x._id)).slice();
                                    const from = ids.indexOf(draggingId);
                                    const to = ids.indexOf(s._id);
                                    if (from === -1 || to === -1) return;
                                    ids.splice(to, 0, ids.splice(from, 1)[0]);
                                    setLocalOrder(ids);
                                    await reorderSubtasks({ ids }).catch(() => { });
                                    setDraggingId(null);
                                }}
                                onDragEnter={(e) => {
                                    if (!orderedSubtasks || !draggingId || draggingId === s._id) return;
                                    const ids = (localOrder ?? orderedSubtasks.map((x) => x._id)).slice();
                                    const from = ids.indexOf(draggingId);
                                    const to = ids.indexOf(s._id);
                                    if (from === -1 || to === -1 || from === to) return;
                                    ids.splice(to, 0, ids.splice(from, 1)[0]);
                                    setLocalOrder(ids);
                                }}
                            >
                                {/* Drag handle */}
                                <button
                                    className="p-1 text-muted-foreground hover:text-foreground cursor-grab"
                                    draggable
                                    onDragStart={(e) => {
                                        setDraggingId(s._id);
                                        if (orderedSubtasks && !localOrder) {
                                            setLocalOrder(orderedSubtasks.map((x) => x._id));
                                        }
                                        e.dataTransfer.effectAllowed = "move";
                                        try { e.dataTransfer.setData("text/plain", String(s._id)); } catch { }
                                    }}
                                    onDragEnd={() => setDraggingId(null)}
                                    aria-label="Drag to reorder"
                                    aria-grabbed={draggingId === s._id}
                                >
                                    <GripVertical className="h-4 w-4" />
                                </button>
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => void toggleSubtask({ id: s._id })}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            void toggleSubtask({ id: s._id });
                                        }
                                    }}
                                    className={cn(
                                        "w-5 h-5 rounded-full border-2 transition-all duration-200",
                                        s.completedAt ? "bg-muted border-muted-foreground/50" : "border-gray-400 hover:bg-muted"
                                    )}
                                    aria-pressed={!!s.completedAt}
                                />
                                {editingSubtaskId === s._id ? (
                                    <Input
                                        value={editingSubtaskText}
                                        onChange={(e) => setEditingSubtaskText(e.target.value)}
                                        onBlur={() => void saveEditSubtask()}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                void saveEditSubtask();
                                            } else if (e.key === "Escape") {
                                                setEditingSubtaskId(null);
                                                setEditingSubtaskText("");
                                            }
                                        }}
                                        className="flex-1 h-8"
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className={cn(
                                            "flex-1 text-sm cursor-pointer hover:text-primary",
                                            s.completedAt && "line-through text-muted-foreground"
                                        )}
                                        onClick={() => startEditSubtask(s._id, s.title)}
                                    >
                                        {s.title}
                                    </div>
                                )}

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-32">
                                            <DropdownMenuItem onClick={() => startEditSubtask(s._id, s.title)}>
                                                <Edit2 className="h-4 w-4 mr-2" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => void handleRemoveSubtask(s._id)} className="text-destructive focus:text-destructive">
                                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))}
                        {subtasks && subtasks.length === 0 && (
                            <p className="text-sm text-muted-foreground">No subtasks yet.</p>
                        )}
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
            </div>
        </div>
    );
}
