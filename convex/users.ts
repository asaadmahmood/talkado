/**
 * User management functions
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
  const user = await ctx.db
    .query("users")
    .withIndex("by_identity", (q: any) =>
      q.eq("identitySubject", identity.subject),
    )
    .first();

  // If found, return the user's email as the persistent user ID
  if (user) {
    return user.email;
  }

  // If no user found, use the identity subject as fallback
  // This handles the case where the user hasn't been created in the users table yet
  return identity.subject;
}

/**
 * Update user profile information
 */
export const update = mutation({
  args: {
    name: v.optional(v.string()),
    timezone: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find user by identity subject
    const user = await ctx.db
      .query("users")
      .withIndex("by_identity", (q: any) =>
        q.eq("identitySubject", identity.subject),
      )
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const updates: any = {
      updatedAt: now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.timezone !== undefined) {
      updates.timezone = args.timezone;
    }

    if (args.profileImageUrl !== undefined) {
      updates.profileImageUrl = args.profileImageUrl;
    }

    console.log("Updating user with:", updates);
    console.log("User ID:", user._id);

    await ctx.db.patch(user._id, updates);

    console.log("User update completed");

    return null;
  },
});

/**
 * Update user email
 */
export const updateEmail = mutation({
  args: {
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // Find user by identity subject
    const user = await ctx.db
      .query("users")
      .withIndex("by_identity", (q: any) =>
        q.eq("identitySubject", identity.subject),
      )
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if email is already taken by another user
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();

    if (existingUser && existingUser._id !== user._id) {
      throw new Error("Email is already taken by another user");
    }

    // Update user's email
    await ctx.db.patch(user._id, {
      email: args.email,
      updatedAt: now(),
    });

    return null;
  },
});
