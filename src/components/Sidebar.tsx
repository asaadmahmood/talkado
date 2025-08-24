"use client"

import * as React from "react"
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect } from "react";
import {
    Calendar,
    CheckSquare,
    Folder,
    GalleryVerticalEnd,
    Settings,
    Search,
    HelpCircle,
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavDocuments } from "./nav-documents"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

export default function CustomSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { signOut } = useAuthActions();
    const projects = useQuery(api.projects.list);
    const labels = useQuery(api.labels.list);
    const createProject = useMutation(api.projects.create);
    const currentUser = useQuery(api.auth.getCurrentUser);
    const setUserEmail = useMutation(api.auth.storeUserEmail);



    // Set user email if authenticated but no email stored
    useEffect(() => {
        if (currentUser && currentUser.email === "" && currentUser.subject) {
            // Check if we have a pending email from sign-in
            const pendingEmail = localStorage.getItem("pendingUserEmail");
            if (pendingEmail) {
                console.log("Found pending email:", pendingEmail);
                void setUserEmail({ email: pendingEmail });
                localStorage.removeItem("pendingUserEmail"); // Clean up
            }
        }
    }, [currentUser, setUserEmail]);

    const data = {
        user: {
            name: currentUser?.name || currentUser?.email?.split('@')[0] || "User",
            email: currentUser?.email || "user@todosplus.com",
            avatar: currentUser?.profileImageUrl || "/avatars/user.jpg",
        },
        navMain: [
            {
                title: "Today",
                url: "/today",
                icon: Calendar,
            },
            {
                title: "All Tasks",
                url: "/all",
                icon: CheckSquare,
            },
        ],
        navProjects: projects?.map(project => ({
            title: project.name,
            url: `/projects/${project._id}`,
            icon: Folder,
            id: project._id,
        })) || [],
        navLabels: labels?.map(label => ({
            name: label.name,
            color: label.color || "#6b7280",
            id: label._id,
        })) || [],
        navSecondary: [
            {
                title: "Get Help",
                url: "#",
                icon: HelpCircle,
            },
            {
                title: "Search",
                url: "#",
                icon: Search,
            },
        ],
    };

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="#">
                                <GalleryVerticalEnd className="!size-5" />
                                <span className="text-base font-semibold">TodosPlus</span>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <NavDocuments
                    items={data.navProjects}
                    labels={data.navLabels}
                    onCreateProject={createProject}
                />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} onSignOut={() => { void signOut(); }} />
            </SidebarFooter>
        </Sidebar>
    );
}
