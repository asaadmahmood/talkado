import { useLocation } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ChevronRight, PanelLeft } from "lucide-react";

export default function SiteHeader() {
    const location = useLocation();

    const getCurrentPageTitle = () => {
        if (location.pathname === "/" || location.pathname === "/today") {
            return "Today";
        } else if (location.pathname === "/all") {
            return "All Tasks";
        } else if (location.pathname.startsWith("/projects/")) {
            return "Project";
        }
        return "Tasks";
    };

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 size-7 -ml-1">
                    <PanelLeft />
                    <span className="sr-only">Toggle Sidebar</span>
                </SidebarTrigger>
                <div
                    data-orientation="vertical"
                    role="none"
                    data-slot="separator"
                    className="bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px mr-2 data-[orientation=vertical]:h-4"
                />
                <nav aria-label="breadcrumb" data-slot="breadcrumb">
                    <ol data-slot="breadcrumb-list" className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5">
                        <li data-slot="breadcrumb-item" className="items-center gap-1.5 hidden md:block">
                            <span className="hover:text-foreground transition-colors">TodosPlus</span>
                        </li>
                        <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className="[&>svg]:size-3.5 hidden md:block">
                            <ChevronRight />
                        </li>
                        <li data-slot="breadcrumb-item" className="inline-flex items-center gap-1.5">
                            <span data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" className="text-foreground font-normal">
                                {getCurrentPageTitle()}
                            </span>
                        </li>
                    </ol>
                </nav>
            </div>
        </header>
    );
}
