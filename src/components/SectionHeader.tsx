import { Badge } from "@/components/ui/badge";

interface SectionHeaderProps {
    title: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    variant?: "default" | "destructive" | "secondary" | "outline";
}

export default function SectionHeader({
    title,
    count,
    icon: Icon,
    variant = "default"
}: SectionHeaderProps) {
    return (
        <div className="flex items-center space-x-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-medium">{title}</h2>
            <Badge variant={variant}>
                {count}
            </Badge>
        </div>
    );
}
