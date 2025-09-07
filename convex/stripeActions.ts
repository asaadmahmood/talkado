"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

const PRICE_ID = process.env.STRIPE_PRICE_ID!;

type UserWithStripe = {
  _id: Id<"users">;
  email: string;
  stripeCustomerId?: string;
};

export const createCheckoutSession = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Normalize subject to the stable base (before the first pipe) to match stored users
    const identityBase = identity.subject.split("|")[0];

    const user: UserWithStripe | null = await ctx.runQuery(
      internal.stripe.getUserByIdentity,
      { identitySubject: identityBase },
    );
    if (!user) throw new Error("User not found");

    let customerId: string = user.stripeCustomerId || "";

    // If we have a stored customerId, verify it exists for this key (test vs live).
    if (customerId) {
      try {
        // Will throw if customer doesn't exist in the current Stripe environment
        await stripe.customers.retrieve(customerId);
      } catch (err: any) {
        // If the customer is missing (e.g., switching between live/test), recreate it
        if (
          typeof err?.message === "string" &&
          err.message.includes("No such customer")
        ) {
          customerId = "";
        } else {
          throw err;
        }
      }
    }

    // Create or get Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id },
      });
      customerId = customer.id;
      await ctx.runMutation(internal.stripe.updateUserStripeCustomer, {
        userId: user._id,
        stripeCustomerId: customerId,
      });
    }

    const session: Stripe.Checkout.Session =
      await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: PRICE_ID, quantity: 1 }],
        mode: "subscription",
        success_url: `${process.env.CLIENT_URL!}/settings?success=true`,
        cancel_url: `${process.env.CLIENT_URL!}/settings?canceled=true`,
        metadata: { userId: user._id },
      });

    return session.url!;
  },
});

export const createPortalSession = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const identityBase = identity.subject.split("|")[0];

    const user: UserWithStripe | null = await ctx.runQuery(
      internal.stripe.getUserByIdentity,
      { identitySubject: identityBase },
    );
    if (!user?.stripeCustomerId) throw new Error("No subscription found");

    const session: Stripe.BillingPortal.Session =
      await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${process.env.CLIENT_URL!}/settings`,
      });
    return session.url;
  },
});

export const handleStripeWebhook = action({
  args: { body: v.string(), signature: v.string() },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        args.body,
        args.signature,
        webhookSecret,
      );
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${String(err)}`);
    }

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub: any = event.data.object as any;
        await ctx.runMutation(internal.stripe.updateSubscription, {
          stripeSubscriptionId: sub.id,
          stripeCustomerId: sub.customer as string,
          status: sub.status,
          currentPeriodEnd: sub.current_period_end * 1000,
          tier: sub.status === "active" ? "pro" : "free",
        });
        break;
      }
      case "customer.subscription.deleted": {
        const sub: any = event.data.object as any;
        await ctx.runMutation(internal.stripe.updateSubscription, {
          stripeSubscriptionId: sub.id,
          stripeCustomerId: sub.customer as string,
          status: "canceled",
          currentPeriodEnd: sub.current_period_end * 1000,
          tier: "free",
        });
        break;
      }
    }

    return null;
  },
});

/**
 * Delete account: cancel active subscription (immediately) and remove user data.
 */
export const deleteAccount = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const identityBase = identity.subject.split("|")[0];

    const user = await ctx.runQuery(internal.stripe.getUserByIdentity, {
      identitySubject: identityBase,
    });

    // Cancel Stripe subscription immediately if exists
    if ((user as any)?.stripeCustomerId) {
      // Try to load subscription id via users table since getUserByIdentity only returns customer id
      // Fetch full user doc to check subscription id
      const full = await ctx.runQuery(internal.stripe.usersDebugLookup, {
        identitySubject: identityBase,
      });
      const subId = full?.stripeSubscriptionId as string | undefined;
      if (subId) {
        try {
          await stripe.subscriptions.cancel(subId);
        } catch {
          // Ignore if already canceled/not found
        }
      }
    }

    // Remove all user data
    await ctx.runMutation(internal.users.deleteUserAndData, {
      identitySubject: identityBase,
    });
    return null;
  },
});
