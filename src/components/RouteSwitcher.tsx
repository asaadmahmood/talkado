import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import {
    Calendar,
    CheckSquare,
    Settings,
    Crown,
    Trash2,
    Folder,
} from "lucide-react";

/**
 * Global route switcher opened with Cmd/Ctrl+K.
 */
export default function RouteSwitcher() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    // Load projects to jump quickly
    const projects = useQuery(api.projects.list) ?? [];

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setOpen((v) => !v);
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    const projectItems = useMemo(
        () =>
            projects.map((p: any) => ({
                id: String(p._id),
                name: p.name as string,
                href: `/projects/${p._id}`,
            })),
        [projects],
    );

    const go = (path: string) => {
        setOpen(false);
        navigate(path);
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen} title="Go to" description="Switch page" showCloseButton>
            <CommandInput placeholder="Type a page or project…" />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Pages">
                    <CommandItem onSelect={() => go("/today")}>
                        <Calendar /> Today
                        <CommandShortcut>T</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => go("/all")}>
                        <CheckSquare /> All Tasks
                    </CommandItem>
                    <CommandItem onSelect={() => go("/settings")}>
                        <Settings /> Settings
                    </CommandItem>
                </CommandGroup>

                {projectItems.length > 0 && (
                    <>
                        <CommandSeparator />
                        <CommandGroup heading="Projects">
                            {projectItems.map((p) => (
                                <CommandItem key={p.id} onSelect={() => go(p.href)}>
                                    <Folder /> {p.name}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </CommandDialog>
    );
}


