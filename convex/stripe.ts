import { query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal functions first to avoid circular references
export const getUserByIdentity = internalQuery({
  args: { identitySubject: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.string(),
      stripeCustomerId: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_identity", (q: any) =>
        q.eq("identitySubject", args.identitySubject),
      )
      .first();

    if (!user) return null;
    return {
      _id: user._id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
    };
  },
});

// Internal helper for actions that need the full user (including subscription id)
export const usersDebugLookup = internalQuery({
  args: { identitySubject: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.string(),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_identity", (q: any) =>
        q.eq("identitySubject", args.identitySubject),
      )
      .first();
    if (!user) return null;
    return {
      _id: user._id,
      email: user.email,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
    } as any;
  },
});

export const updateUserStripeCustomer = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      stripeCustomerId: args.stripeCustomerId,
    });
    return null;
  },
});

export const updateSubscription = internalMutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripeCustomerId: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("incomplete"),
    ),
    currentPeriodEnd: v.number(),
    tier: v.union(v.literal("free"), v.literal("pro")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let user = null as any;
    if (args.stripeCustomerId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_stripe_customer", (q: any) =>
          q.eq("stripeCustomerId", args.stripeCustomerId),
        )
        .first();
    }

    if (user) {
      await ctx.db.patch(user._id, {
        stripeSubscriptionId: args.stripeSubscriptionId,
        subscriptionStatus: args.status,
        subscriptionCurrentPeriodEnd: args.currentPeriodEnd,
        subscriptionTier: args.tier,
      });
    }

    return null;
  },
});

/**
 * Get current user's subscription status
 */
export const getSubscription = query({
  args: {},
  returns: v.object({
    tier: v.union(v.literal("free"), v.literal("pro")),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("canceled"),
        v.literal("past_due"),
        v.literal("incomplete"),
      ),
    ),
    currentPeriodEnd: v.optional(v.number()),
    canUseAI: v.boolean(),
    projectLimit: v.number(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Normalize to base subject stored in users table
    const identityBase = identity.subject.split("|")[0];

    const user = await ctx.db
      .query("users")
      .withIndex("by_identity", (q: any) =>
        q.eq("identitySubject", identityBase),
      )
      .first();

    if (!user) {
      return {
        tier: "free" as const,
        canUseAI: false,
        projectLimit: 5,
      };
    }

    const isPro =
      user.subscriptionTier === "pro" &&
      user.subscriptionStatus === "active" &&
      (!user.subscriptionCurrentPeriodEnd ||
        user.subscriptionCurrentPeriodEnd > Date.now());

    return {
      tier: isPro ? ("pro" as const) : ("free" as const),
      status: user.subscriptionStatus,
      currentPeriodEnd: user.subscriptionCurrentPeriodEnd,
      canUseAI: isPro,
      projectLimit: isPro ? 15 : 5,
    };
  },
});

// Actions moved to convex/stripeActions.ts
