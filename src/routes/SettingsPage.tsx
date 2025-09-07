import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { User, Camera, Lock, Save, Trash2 } from "lucide-react";
import timezonesData from "../utils/timezones.json";
import SubscriptionManager from "../components/SubscriptionManager";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { useToast } from "@/hooks/use-toast";
import { Toast } from "@/components/ui/toast";


// Type for timezone data
interface TimezoneData {
    label: string;
    tzCode: string;
    name: string;
    utc: string;
}

// Function to get user's local timezone
const getUserLocalTimezone = (): string => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        console.warn("Could not detect local timezone, falling back to UTC");
        return "UTC";
    }
};

// Use timezones from the JSON file
const TIMEZONES = (timezonesData as TimezoneData[]).map((tz: TimezoneData) => ({
    value: tz.tzCode,
    label: tz.label
}));

// Function to filter timezones based on search
const getFilteredTimezones = (search: string) => {
    if (!search) return TIMEZONES;
    const lowerSearch = search.toLowerCase();
    return TIMEZONES.filter(tz =>
        tz.label.toLowerCase().includes(lowerSearch) ||
        tz.value.toLowerCase().includes(lowerSearch)
    );
};

export default function SettingsPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'settings' | 'password' | 'subscription' | 'delete'>('settings');
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [timezone, setTimezone] = useState(getUserLocalTimezone());
    const [timezoneSearch, setTimezoneSearch] = useState("");
    const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [hasInitializedPreview, setHasInitializedPreview] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast, toasts, dismiss } = useToast();
    const { signOut } = useAuthActions();

    // Get current user data
    const user = useQuery(api.auth.getCurrentUser);
    const updateUser = useMutation(api.users.update);
    const updatePassword = useMutation(api.auth.updatePassword);
    const storeProfileImage = useAction(api.fileUpload.storeProfileImage);
    const updateEmail = useMutation(api.users.updateEmail);
    const deleteAccount = useAction(api.stripeActions.deleteAccount);

    // Keep tabs in sync with URL
    useEffect(() => {
        const segment = location.pathname.split("/")[2] || "settings";
        if (segment === "settings" || segment === "password" || segment === "subscription" || segment === "delete") {
            setActiveTab(segment);
        }
    }, [location.pathname]);

    // Initialize form with user data
    useEffect(() => {
        console.log("SettingsPage useEffect triggered");
        console.log("User data:", user);
        console.log("Has initialized preview:", hasInitializedPreview);

        if (user && !hasInitializedPreview) {
            console.log("Loading user data:", user);
            console.log("User fields:", {
                name: user.name,
                email: user.email,
                timezone: user.timezone,
                profileImageUrl: user.profileImageUrl
            });

            // Set form values
            setName(user.name || "");
            setEmail(user.email || "");
            const userTimezone = user.timezone || getUserLocalTimezone();
            setTimezone(userTimezone);
            setTimezoneSearch(TIMEZONES.find(tz => tz.value === userTimezone)?.label || "");

            if (user.profileImageUrl) {
                setPreviewUrl(user.profileImageUrl);
                console.log("Setting preview URL to:", user.profileImageUrl);
            }

            setHasInitializedPreview(true);
            console.log("User data loaded into form");
        } else if (user && hasInitializedPreview) {
            console.log("User data already initialized, but user changed");
            // Update form if user data changes
            setName(user.name || "");
            setEmail(user.email || "");
            const userTimezone = user.timezone || getUserLocalTimezone();
            setTimezone(userTimezone);
            setTimezoneSearch(TIMEZONES.find(tz => tz.value === userTimezone)?.label || "");
            if (user.profileImageUrl) {
                setPreviewUrl(user.profileImageUrl);
            }
        }
    }, [user, hasInitializedPreview]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            const timezoneContainer = target.closest('#timezone-container');
            if (!timezoneContainer) {
                setShowTimezoneDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Reset form when user data changes
    useEffect(() => {
        if (user) {
            console.log("User data changed, resetting form");
            setHasInitializedPreview(false);
        }
    }, [user]); // Reset when the user identity changes

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                toast({
                    title: "Invalid file type",
                    description: "Please select an image file.",
                    variant: "destructive",
                });
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: "File too large",
                    description: "Please select an image smaller than 5MB.",
                    variant: "destructive",
                });
                return;
            }

            setProfileImage(file);

            // Create preview URL
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleSaveProfile = async () => {
        setIsLoading(true);
        try {
            // Upload profile image if selected
            let profileImageUrl = undefined;
            if (profileImage) {
                try {
                    // Convert File to ArrayBuffer for Convex
                    const arrayBuffer = await profileImage.arrayBuffer();

                    // Store the image directly using Convex storage
                    profileImageUrl = await storeProfileImage({ image: arrayBuffer });
                    console.log("Uploaded image URL:", profileImageUrl);

                    // Update the preview URL with the new uploaded image
                    setPreviewUrl(profileImageUrl);
                    console.log("Preview URL set to:", profileImageUrl);
                } catch (uploadError) {
                    console.error("Image upload error:", uploadError);
                    toast({
                        title: "Image upload failed",
                        description: "Failed to upload profile image. Please try again.",
                        variant: "destructive",
                    });
                    setIsLoading(false);
                    return;
                }
            }

            // Update user profile
            console.log("Saving profile with data:", {
                name: name.trim(),
                timezone,
                profileImageUrl,
            });

            await updateUser({
                name: name.trim(),
                timezone,
                profileImageUrl,
            });

            console.log("Profile updated with image URL:", profileImageUrl);

            // Force refresh of user data
            console.log("Profile saved successfully, user data should refresh");

            toast({
                title: "Profile updated",
                description: "Your profile has been updated successfully.",
            });

            // Clear the temporary profile image state since it's now saved
            setProfileImage(null);

            // Force a refresh of the user data to ensure the sidebar updates
            // The user query should automatically refresh due to Convex reactivity


        } catch {
            toast({
                title: "Error",
                description: "Failed to update profile. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast({
                title: "Passwords don't match",
                description: "Please make sure your new passwords match.",
                variant: "destructive",
            });
            return;
        }

        if (newPassword.length < 8) {
            toast({
                title: "Password too short",
                description: "Password must be at least 8 characters long.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            await updatePassword({
                currentPassword,
                newPassword,
            });

            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            toast({
                title: "Password updated",
                description: "Your password has been successfully updated.",
            });
        } catch {
            toast({
                title: "Error",
                description: "Failed to update password. Please check your current password.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmed = window.confirm(
            "This will permanently delete your account, projects, tasks, and labels. This cannot be undone. Continue?",
        );
        if (!confirmed) return;
        setIsLoading(true);
        try {
            await deleteAccount({});
            // Best-effort sign out to invalidate session
            await signOut().catch(() => { });
            toast({
                title: "Account deleted",
                description: "Your account and all associated data have been removed.",
            });
            // After deletion, a sign-out/redirect would typically occur. For now, refresh.
            window.location.href = "/";
        } catch (err: any) {
            toast({
                title: "Failed to delete account",
                description: err?.message || "Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateEmail = async () => {
        if (!newEmail.trim()) {
            toast({
                title: "Email required",
                description: "Please enter a new email address.",
                variant: "destructive",
            });
            return;
        }

        setIsChangingEmail(true);
        try {
            await updateEmail({
                email: newEmail.trim(),
            });

            setEmail(newEmail.trim());
            setNewEmail("");
            setIsChangingEmail(false);

            toast({
                title: "Email updated",
                description: "Your email has been successfully updated.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update email. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsChangingEmail(false);
        }
    };

    if (!user) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            {/* Toast notifications */}
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}

            <div className="space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold">Settings</h1>
                    <p className="text-gray-300 mt-2">Manage your account settings and preferences.</p>
                </div>

                {/* Tabs */}
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => {
                        const value = v as 'settings' | 'password' | 'subscription' | 'delete';
                        setActiveTab(value);
                        // Navigation intentionally fired without awaiting
                        void navigate(value === 'settings' ? '/settings' : `/settings/${value}`);
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                        <TabsTrigger value="password">Password</TabsTrigger>
                        <TabsTrigger value="subscription">Subscription</TabsTrigger>
                        <TabsTrigger value="delete">Delete</TabsTrigger>
                    </TabsList>

                    {/* Profile Section */}
                    <TabsContent value="settings">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Profile Information
                                </CardTitle>
                                <CardDescription>
                                    Update your personal information and profile picture.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Profile Picture */}
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                                            {previewUrl ? (
                                                <img
                                                    src={previewUrl}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <User className="h-8 w-8 text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="absolute -bottom-2 -right-2 h-8 w-8 p-0 rounded-full"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Camera className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">Profile Picture</p>
                                        <p className="text-sm text-gray-500">
                                            Upload a new profile picture (max 5MB)
                                        </p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </div>
                                </div>

                                {/* Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Enter your full name"
                                    />
                                </div>

                                {/* Email */}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    {isChangingEmail ? (
                                        <div className="space-y-2">
                                            <Input
                                                id="new-email"
                                                type="email"
                                                value={newEmail}
                                                onChange={(e) => setNewEmail(e.target.value)}
                                                placeholder="Enter new email address"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => void handleUpdateEmail()}
                                                    disabled={isChangingEmail}
                                                >
                                                    {isChangingEmail ? "Updating..." : "Update Email"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsChangingEmail(false);
                                                        setNewEmail("");
                                                    }}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Input
                                                id="email"
                                                value={email}
                                                disabled
                                                className="bg-gray-50"
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setIsChangingEmail(true)}
                                            >
                                                Change Email
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Timezone */}
                                <div className="space-y-2">
                                    <Label htmlFor="timezone">Timezone</Label>
                                    <div className="relative" id="timezone-container">
                                        <Input
                                            id="timezone"
                                            value={timezoneSearch}
                                            onChange={(e) => {
                                                setTimezoneSearch(e.target.value);
                                                setShowTimezoneDropdown(true);
                                            }}
                                            onFocus={() => setShowTimezoneDropdown(true)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Escape') {
                                                    setShowTimezoneDropdown(false);
                                                }
                                            }}
                                            placeholder="Search for a timezone (e.g., New York, London, Tokyo)"
                                            className="w-full"
                                        />
                                        {showTimezoneDropdown && (
                                            <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {getFilteredTimezones(timezoneSearch).map((tz) => (
                                                    <button
                                                        key={tz.value}
                                                        className="w-full px-4 py-2 text-left hover:bg-gray-700 focus:bg-gray-700 focus:outline-none text-white"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            console.log('Timezone clicked:', tz.label, tz.value);
                                                            setTimezone(tz.value);
                                                            setTimezoneSearch(tz.label);
                                                            setShowTimezoneDropdown(false);
                                                        }}
                                                    >
                                                        {tz.label}
                                                    </button>
                                                ))}
                                                {getFilteredTimezones(timezoneSearch).length === 0 && (
                                                    <div className="px-4 py-2 text-gray-400">
                                                        No timezones found
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Button onClick={() => void handleSaveProfile()} disabled={isLoading}>
                                    <Save className="h-4 w-4 mr-2" />
                                    {isLoading ? "Saving..." : "Save Profile"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Password Section */}
                    <TabsContent value="password">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="h-5 w-5" />
                                    Change Password
                                </CardTitle>
                                <CardDescription>
                                    Update your password to keep your account secure.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">Current Password</Label>
                                    <Input
                                        id="current-password"
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter your current password"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter your new password"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm your new password"
                                    />
                                </div>

                                <Button
                                    onClick={() => void handleUpdatePassword()}
                                    disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
                                >
                                    <Lock className="h-4 w-4 mr-2" />
                                    {isLoading ? "Updating..." : "Update Password"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Subscription Section */}
                    <TabsContent value="subscription">
                        <SubscriptionManager />
                    </TabsContent>

                    {/* Delete Account Section */}
                    <TabsContent value="delete">
                        <Card className="border-red-900/40 bg-red-900/10">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-red-400">
                                    <Trash2 className="h-5 w-5" />
                                    Delete account
                                </CardTitle>
                                <CardDescription>
                                    Permanently remove your account and all data.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        void handleDeleteAccount();
                                    }}
                                    disabled={isLoading}
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {isLoading ? "Deleting..." : "Delete account"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
