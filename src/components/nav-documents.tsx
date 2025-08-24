"use client"

import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { LucideIcon, Plus, Tag } from "lucide-react"


import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavDocuments({
    items,
    labels,
    onCreateProject,
}: {
    items: {
        title: string
        url: string
        icon?: LucideIcon
        id: string
    }[]
    labels: {
        name: string
        color: string
        id: string
    }[]
    onCreateProject: (args: { name: string }) => Promise<any>
}) {
    const location = useLocation();
    const [newProjectName, setNewProjectName] = useState("");
    const [showNewProjectForm, setShowNewProjectForm] = useState(false);

    const isActive = (url: string) => {
        return location.pathname === url;
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        try {
            await onCreateProject({ name: newProjectName.trim() });
            setNewProjectName("");
            setShowNewProjectForm(false);
        } catch (error) {
            console.error("Failed to create project:", error);
        }
    };

    return (
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarGroupLabel>
                <div className="flex items-center justify-between w-full">
                    <span>Projects</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewProjectForm(!showNewProjectForm)}
                        className="h-4 w-4 p-0"
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
            </SidebarGroupLabel>

            {showNewProjectForm && (
                <div className="px-2 pb-2">
                    <form onSubmit={(e) => void handleCreateProject(e)} className="space-y-2">
                        <Input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            placeholder="Project name"
                            autoFocus
                            className="h-7 text-sm"
                        />
                    </form>
                </div>
            )}

            <SidebarMenu>
                {items.map((item) => (
                    <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                            asChild
                            isActive={isActive(item.url)}
                        >
                            <Link to={item.url}>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    )
}
