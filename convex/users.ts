/**
 * User management functions
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { now } from "./_utils";

/**
 * Get or create the current user
 */
export const getOrCreateUser = mutation({
  args: {},
  returns: v.object({
    _id: v.id("users"),
    email: v.string(),
    name: v.optional(v.string()),
    identitySubject: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user exists by email
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .first();

    if (user) {
      // Update the identity subject if it has changed or is missing
      if (user.identitySubject !== identity.subject) {
        await ctx.db.patch(user._id, {
          identitySubject: identity.subject,
          updatedAt: now(),
        });
        user = await ctx.db.get(user._id);
      }
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        email: identity.email || "",
        name: identity.name,
        identitySubject: identity.subject,
        createdAt: now(),
        updatedAt: now(),
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new Error("Failed to get or create user");
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      identitySubject: user.identitySubject,
    };
  },
});

/**
 * Get the current user by identity subject
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.optional(v.id("users")),
      email: v.string(),
      name: v.optional(v.string()),
      identitySubject: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Try to find user by email (safer approach)
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", identity.email || ""))
      .first();

    // If user exists in users table, return it
    if (user) {
      return user;
    }

    // If no user in users table, return identity information
    // Since email and name are undefined, create a user-friendly display
    const userDisplayName =
      identity.subject.split("|").pop()?.slice(0, 8) || "User";

    return {
      _id: undefined,
      email: `user-${userDisplayName}@example.com`, // Create a placeholder email
      name: `User ${userDisplayName}`, // Create a placeholder name
      identitySubject: identity.subject,
    };
  },
});

/**
 * Get user by email (for finding existing users)
 */
export const getUserByEmail = query({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      email: v.string(),
      name: v.optional(v.string()),
      identitySubject: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    return user;
  },
});

/**
 * Ensure user exists (called automatically on first access)
 */
export const ensureUserExists = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user exists by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email || ""))
      .first();

    if (!user) {
      // Create new user
      await ctx.db.insert("users", {
        email: identity.email || "",
        name: identity.name,
        identitySubject: identity.subject,
        createdAt: now(),
        updatedAt: now(),
      });
    } else if (user.identitySubject !== identity.subject) {
      // Update the identity subject if it has changed
      await ctx.db.patch(user._id, {
        identitySubject: identity.subject,
        updatedAt: now(),
      });
    }

    return null;
  },
});
