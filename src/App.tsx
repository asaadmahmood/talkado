// Removed Authenticated/Unauthenticated wrappers; we gate on getCurrentUser
import { Routes, Route, useLocation, Navigate, Outlet } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
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
import SettingsPage from "./routes/SettingsPage";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskSelectionProvider, useTaskSelection } from "./contexts/TaskSelectionContext";
import TaskDetailsPanel from "./components/TaskDetailsPanel";
import { Toaster } from "@/components/ui/sonner";
import RouteSwitcher from "./components/RouteSwitcher";

function normalizeAuthErrorMessage(msg: string): string {
  const text = (msg || "").toString();
  if (/invalid\s*secret/i.test(text) || /invalidsecret/i.test(text)) {
    return "Incorrect email or password.";
  }
  if (/retrieveaccount|authorize|handlecredentials/i.test(text)) {
    return "We couldn’t verify your credentials. Please check your email and password.";
  }
  if (/cannot\s*read\s*properties\s*of\s*null/i.test(text) || /reading\s*'_id'/i.test(text)) {
    return "We couldn’t find that account. Try signing up or use a different email.";
  }
  return "Something went wrong. Please try again.";
}

export default function App() {
  // Apply dark theme to document root so Portal components inherit it
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => {
      document.documentElement.classList.remove('dark');
    };
  }, []);

  // Add debugging to check auth state
  useEffect(() => {
    console.log("App component mounted - checking auth state");
  }, []);

  // Force a call to getCurrentUser to check authentication state
  const currentUser = useQuery(api.auth.getCurrentUser);
  const isSignedIn = !!(currentUser && currentUser.email);

  // Add debugging to see when currentUser changes
  useEffect(() => {
    console.log("Current user changed:", currentUser);
  }, [currentUser]);

  return (
    <div className="bg-background text-foreground">
      {/* Public and protected routes at the top level so /auth routes work without app shell */}
      <Routes>
        {/* Public auth routes */}
        <Route path="/auth/*" element={<AuthRoutes />} />

        {/* Protected app shell */}
        <Route element={<RequireAuth />}>
          <Route path="/*" element={<TodosApp />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>

      {isSignedIn && <RouteSwitcher />}
      <Toaster />
    </div>
  );
}

function RequireAuth() {
  const currentUser = useQuery(api.auth.getCurrentUser);
  const isSignedIn = !!(currentUser && currentUser.email);
  if (currentUser === undefined) return null;
  return isSignedIn ? <Outlet /> : <Navigate to="/auth/signin" replace />;
}

function AuthRoutes() {
  const currentUser = useQuery(api.auth.getCurrentUser);
  const isSignedIn = !!(currentUser && currentUser.email);
  if (currentUser === undefined) return null;
  if (isSignedIn) {
    return <Navigate to="/today" replace />;
  }
  return (
    <Routes>
      <Route path="signin" element={<AuthPage initialFlow="signIn" />} />
      <Route path="signup" element={<AuthPage initialFlow="signUp" />} />
      <Route path="*" element={<Navigate to="/auth/signin" replace />} />
    </Routes>
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
              <div className="container mx-auto py-8 max-w-4xl">
                <div className="flex-1 overflow-auto">
                  <Routes>
                    {/* Public auth routes */}
                    <Route path="/auth/*" element={<AuthRoutes />} />

                    {/* Protected app routes */}
                    <Route element={<RequireAuth />}>
                      <Route path="/" element={<TodayPage />} />
                      <Route path="/today" element={<TodayPage />} />
                      <Route path="/all" element={<AllPage />} />
                      <Route path="/projects/:projectId" element={<ProjectPage />} />
                      <Route path="/settings/*" element={<SettingsPage />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/today" replace />} />
                  </Routes>
                </div>
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

function AuthPage({ initialFlow }: { initialFlow?: "signIn" | "signUp" }) {
  console.log("AuthPage component rendered - user is not authenticated");

  const { signIn } = useAuthActions();
  const storeUserEmail = useMutation(api.auth.storeUserEmail);
  const migrateUsers = useMutation(api.auth.migrateUsers);
  const ensureUserExists = useMutation(api.auth.ensureUserExists);
  const debugUserState = useQuery(api.auth.debugUserState);
  const [flow, setFlow] = useState<"signIn" | "signUp">(initialFlow ?? "signIn");
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
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const email = formData.get("email") as string;
              const name = (formData.get("name") as string | null) || localStorage.getItem("pendingUserName");
              formData.set("flow", flow);

              void (async () => {
                try {
                  console.log("Starting sign-in process...");
                  const email = formData.get("email") as string;
                  console.log("Signing in with email:", email);

                  // Store the email/name in localStorage before sign-in
                  localStorage.setItem("pendingUserEmail", email);
                  if (name && name.trim()) {
                    localStorage.setItem("pendingUserName", name.trim());
                  }

                  await signIn("password", formData);
                  console.log("Sign-in successful");

                  // After sign-in, persist email/name to users table
                  const pendingEmail = localStorage.getItem("pendingUserEmail");
                  const pendingName = localStorage.getItem("pendingUserName") || undefined;
                  if (pendingEmail) {
                    try {
                      await storeUserEmail({ email: pendingEmail, name: pendingName });
                    } catch (e) {
                      console.warn("storeUserEmail failed", e);
                    }
                  }

                  // Add debugging to check auth state
                  setTimeout(() => {
                    console.log("Checking auth state after sign-in...");
                    // You can add more debugging here
                  }, 1000);

                  // Add more debugging to check auth state
                  setTimeout(() => {
                    console.log("Checking auth state 2 seconds after sign-in...");
                  }, 2000);
                } catch (error: any) {
                  console.error("Error during sign-in:", error);
                  const friendly = normalizeAuthErrorMessage(error?.message ?? String(error));
                  setError(friendly);
                }
              })();
            }}
          >
            <div className="space-y-4">
              {flow === "signUp" && (
                <Input
                  type="text"
                  name="name"
                  placeholder="Full name (optional)"
                />
              )}
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
              <Alert variant="destructive" className="mt-2">
                <AlertCircle />
                <AlertTitle>Sign-in failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
