import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToastProps {
    toast: {
        id: string;
        title: string;
        description?: string;
        variant?: "default" | "destructive";
    };
    onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
    return (
        <div
            className={cn(
                "fixed top-4 right-4 z-50 w-96 p-4 rounded-lg shadow-lg border",
                toast.variant === "destructive"
                    ? "bg-red-50 border-red-200 text-red-800"
                    : "bg-white border-gray-200 text-gray-900"
            )}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <h4 className="font-medium">{toast.title}</h4>
                    {toast.description && (
                        <p className="text-sm mt-1 opacity-90">{toast.description}</p>
                    )}
                </div>
                <button
                    onClick={() => onDismiss(toast.id)}
                    className="ml-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
