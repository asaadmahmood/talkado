import { Authenticated, Unauthenticated } from "convex/react";
import { Routes, Route, useLocation } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect } from "react";
import { Id } from "../convex/_generated/dataModel";
import CustomSidebar from "./components/Sidebar.tsx";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import SiteHeader from "./components/SiteHeader";
import QuickAdd from "./components/QuickAdd";
import TodayPage from "./routes/TodayPage";
import AllPage from "./routes/AllPage";
import ProjectPage from "./routes/ProjectPage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskSelectionProvider, useTaskSelection } from "./contexts/TaskSelectionContext";
import TaskDetailsPanel from "./components/TaskDetailsPanel";

export default function App() {
  // Apply dark theme to document root so Portal components inherit it
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Authenticated>
        <TodosApp />
      </Authenticated>
      <Unauthenticated>
        <AuthPage />
      </Unauthenticated>
    </div>
  );
}

function TodosApp() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "16rem",
          "--header-height": "3rem",
        } as React.CSSProperties
      }
    >
      <TaskSelectionProvider>
        <TodosAppLayout />
      </TaskSelectionProvider>
    </SidebarProvider>
  );
}

function TodosAppLayout() {
  const [quickAddFocused, setQuickAddFocused] = useState(false);
  const { isDetailsPanelOpen, selectedTask, closeDetailsPanel } = useTaskSelection();
  const location = useLocation();

  // Extract project ID from URL if we're on a project page
  const projectIdMatch = location.pathname.match(/^\/projects\/(.+)$/);
  const currentProjectId = projectIdMatch ? (projectIdMatch[1] as Id<"projects">) : undefined;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickAddFocused(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <CustomSidebar variant="inset" />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className={`flex flex-col h-full ${isDetailsPanelOpen ? 'pr-96' : ''} transition-all duration-300`}>
              {/* Top Bar with Quick Add */}
              <CardContent className="p-4">
                <QuickAdd
                  focused={quickAddFocused}
                  onFocusChange={setQuickAddFocused}
                  projectId={currentProjectId}
                />
              </CardContent>

              {/* Page Content */}
              <div className="flex-1 overflow-auto">
                <Routes>
                  <Route path="/" element={<TodayPage />} />
                  <Route path="/today" element={<TodayPage />} />
                  <Route path="/all" element={<AllPage />} />
                  <Route path="/projects/:projectId" element={<ProjectPage />} />
                </Routes>
              </div>
            </div>
          </div>
        </div>

        {/* Task Details Panel */}
        {isDetailsPanelOpen && selectedTask && (
          <div className="fixed right-0 top-0 h-full z-50">
            <TaskDetailsPanel
              task={selectedTask}
              onClose={closeDetailsPanel}
            />
          </div>
        )}
      </SidebarInset>
    </>
  );
}

function AuthPage() {
  const { signIn } = useAuthActions();
  const storeUserEmail = useMutation(api.auth.storeUserEmail);
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold">TodosPlus</h1>
            <p className="mt-2 text-muted-foreground">
              {flow === "signIn" ? "Sign in to your account" : "Create your account"}
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const email = formData.get("email") as string;
              formData.set("flow", flow);

              try {
                console.log("Starting sign-in process...");
                const email = formData.get("email") as string;
                console.log("Signing in with email:", email);

                // Store the email in localStorage before sign-in
                localStorage.setItem("pendingUserEmail", email);

                await signIn("password", formData);
                console.log("Sign-in successful");
              } catch (error: any) {
                console.error("Error during sign-in:", error);
                setError(error.message);
              }
            }}
          >
            <div className="space-y-4">
              <Input
                type="email"
                name="email"
                placeholder="Email address"
                required
              />
              <Input
                type="password"
                name="password"
                placeholder="Password"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              {flow === "signIn" ? "Sign in" : "Sign up"}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
                className="text-sm"
              >
                {flow === "signIn"
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </Button>
            </div>

            {error && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="p-3">
                  <p className="text-destructive text-sm">{error}</p>
                </CardContent>
              </Card>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
