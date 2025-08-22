import { createContext, useContext, useState, ReactNode } from "react";
import { Id } from "../../convex/_generated/dataModel";

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

interface TaskSelectionContextType {
    selectedTask: Task | null;
    setSelectedTask: (task: Task | null) => void;
    isDetailsPanelOpen: boolean;
    openDetailsPanel: (task: Task) => void;
    closeDetailsPanel: () => void;
}

const TaskSelectionContext = createContext<TaskSelectionContextType | undefined>(undefined);

export function TaskSelectionProvider({ children }: { children: ReactNode }) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);

    const openDetailsPanel = (task: Task) => {
        setSelectedTask(task);
        setIsDetailsPanelOpen(true);
    };

    const closeDetailsPanel = () => {
        setIsDetailsPanelOpen(false);
        setSelectedTask(null);
    };

    return (
        <TaskSelectionContext.Provider value={{
            selectedTask,
            setSelectedTask,
            isDetailsPanelOpen,
            openDetailsPanel,
            closeDetailsPanel
        }}>
            {children}
        </TaskSelectionContext.Provider>
    );
}

export function useTaskSelection() {
    const context = useContext(TaskSelectionContext);
    if (context === undefined) {
        throw new Error('useTaskSelection must be used within a TaskSelectionProvider');
    }
    return context;
}
