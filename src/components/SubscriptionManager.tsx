import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function SubscriptionManager() {
    const subscription = useQuery(api.stripe.getSubscription);
    const createCheckoutSession = useAction(api.stripeActions.createCheckoutSession);
    const createPortalSession = useAction(api.stripeActions.createPortalSession);

    const handleUpgrade = async () => {
        try {
            const url = await createCheckoutSession({});
            window.location.href = url;
        } catch (error) {
            console.error("Failed to create checkout session:", error);
            toast.error("Failed to start checkout process");
        }
    };

    const handleManageSubscription = async () => {
        try {
            const url = await createPortalSession({});
            window.location.href = url;
        } catch (error) {
            console.error("Failed to create portal session:", error);
            toast.error("Failed to open billing portal");
        }
    };

    if (!subscription) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-muted-foreground">Loading subscription...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const isPro = subscription.tier === "pro" && subscription.status === "active";

    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center gap-2 mt-6">
                    <Crown className="h-5 w-5" />
                    Subscription Plans
                </div>
                <p className="text-muted-foreground">Manage your subscription and billing</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                {/* Free Plan */}
                <Card className="border-muted bg-background/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Free Plan</CardTitle>
                            {isPro ? (
                                <Badge variant="secondary">Available</Badge>
                            ) : (
                                <Badge variant="default">Current</Badge>
                            )}
                        </div>
                        <CardDescription>Free forever</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Unlimited tasks</div>
                            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />5 projects</div>
                            <div className="flex items-center gap-2"><div className="h-4 w-4 rounded border border-gray-300" />AI Voice Input (Pro only)</div>
                            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Priority system (P1, P2, P3)</div>
                            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Recurring tasks</div>
                        </div>
                        {isPro ? (
                            <Button variant="outline" onClick={handleManageSubscription} className="w-full">Downgrade to Free</Button>
                        ) : (
                            <Button disabled className="w-full">Current Plan</Button>
                        )}
                    </CardContent>
                </Card>

                {/* Pro Plan */}
                <Card className="border-muted bg-background/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Pro Plan</CardTitle>
                            {isPro ? (
                                <Badge variant="default">Active</Badge>
                            ) : (
                                <Badge variant="secondary">Available</Badge>
                            )}
                        </div>
                        <CardDescription>$4.99/month</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Unlimited tasks</div>
                            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />15 projects</div>
                            <div className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span className="flex items-center gap-1">AI Voice Input<Sparkles className="h-3 w-3" /></span>
                            </div>
                            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Priority system (P1, P2, P3)</div>
                            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" />Recurring tasks</div>
                        </div>
                        {isPro ? (
                            <Button variant="outline" onClick={handleManageSubscription} className="w-full">Manage Subscription</Button>
                        ) : (
                            <Button onClick={handleUpgrade} className="w-full"><Crown className="h-4 w-4 mr-2" />Upgrade to Pro</Button>
                        )}
                        {isPro && subscription.currentPeriodEnd && (
                            <p className="text-xs text-muted-foreground text-center">Next billing date: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
