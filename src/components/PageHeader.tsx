import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PageHeaderProps {
    title: string;
    taskCount: number;
    icon: React.ComponentType<{ className?: string }>;
    subtitle?: string;
}

export default function PageHeader({
    title,
    taskCount,
    icon: Icon,
    subtitle
}: PageHeaderProps) {
    const defaultSubtitle = `${taskCount} incomplete ${taskCount === 1 ? "task" : "tasks"}`;

    return (
        <Card className="border-none">
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{title}</h1>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <Icon className="h-4 w-4 mr-1" />
                            <span>
                                {subtitle || defaultSubtitle}
                            </span>
                        </div>
                    </div>
                </CardTitle>
            </CardHeader>
        </Card>
    );
}
