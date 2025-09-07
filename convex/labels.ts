/**
 * Label management functions
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { now } from "./_utils";

/**
 * Get the current user's persistent ID (email)
 */
async function getCurrentUserId(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Try to find user by identity subject first
  const identityBase = identity.subject.split("|")[0];
  const user = await ctx.db
    .query("users")
    .withIndex("by_identity", (q: any) => q.eq("identitySubject", identityBase))
    .first();

  // If found, return the user's email as the persistent user ID
  if (user) {
    return user.email;
  }

  // If no user found, use the identity subject as fallback
  // This handles the case where the user hasn't been created in the users table yet
  return identityBase;
}

/**
 * List all labels for the authenticated user
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("labels"),
      _creationTime: v.number(),
      userId: v.string(),
      name: v.string(),
      color: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, _args) => {
    const userId = await getCurrentUserId(ctx);

    const labels = await ctx.db
      .query("labels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();

    // Sort by name
    return labels.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Create a new label
 */
export const create = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  returns: v.id("labels"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const normalizedName = args.name.trim().toLowerCase();

    // Check if label already exists (case-insensitive)
    const existingLabel = await ctx.db
      .query("labels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), normalizedName))
      .first();

    if (existingLabel) {
      throw new Error("Label already exists");
    }

    const timestamp = now();
    const labelId = await ctx.db.insert("labels", {
      userId: userId,
      name: normalizedName,
      color: args.color,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return labelId;
  },
});

/**
 * Update a label
 */
export const update = mutation({
  args: {
    labelId: v.id("labels"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const label = await ctx.db.get(args.labelId);
    if (!label) {
      throw new Error("Label not found");
    }

    if (label.userId !== userId) {
      throw new Error("Not authorized");
    }

    const updates: any = {
      updatedAt: now(),
    };

    if (args.name !== undefined) {
      const normalizedName = args.name.trim().toLowerCase();

      // Check if label already exists (case-insensitive)
      const existingLabel = await ctx.db
        .query("labels")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) =>
          q.and(
            q.eq(q.field("name"), normalizedName),
            q.neq(q.field("_id"), args.labelId),
          ),
        )
        .first();

      if (existingLabel) {
        throw new Error("Label already exists");
      }

      updates.name = normalizedName;
    }

    if (args.color !== undefined) {
      updates.color = args.color;
    }

    await ctx.db.patch(args.labelId, updates);

    return null;
  },
});

/**
 * Delete a label
 */
export const remove = mutation({
  args: {
    labelId: v.id("labels"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const label = await ctx.db.get(args.labelId);
    if (!label) {
      throw new Error("Label not found");
    }

    if (label.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.labelId);

    return null;
  },
});
