import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { now } from "./_utils";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

/**
 * Get the current authenticated user's information
 */
export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.object({
      subject: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Debug: Log the identity subject we're searching for
    console.log("Searching for user with identity subject:", identity.subject);

    // Try to find user in users table by identity subject
    const user = await ctx.db
      .query("users")
      .withIndex("by_identity", (q) =>
        q.eq("identitySubject", identity.subject),
      )
      .first();

    // Debug: Log what we found
    console.log("Found user:", user);

    // If user found, return their information
    if (user) {
      return {
        subject: identity.subject,
        email: user.email,
        name: user.name,
      };
    }

    // If no user found, return identity with empty email
    // Note: We can't create a user here because this is a query, not a mutation
    return {
      subject: identity.subject,
      email: "",
      name: undefined,
    };
  },
});

/**
 * Store user email after successful authentication
 */
export const storeUserEmail = mutation({
  args: {
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    console.log(
      "Storing email for identity:",
      identity.subject,
      "Email:",
      args.email,
    );

    // Check if user already exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_identity", (q) =>
        q.eq("identitySubject", identity.subject),
      )
      .first();

    console.log("Existing user found:", user);

    if (user) {
      // Update existing user's email
      console.log("Updating existing user with email:", args.email);
      await ctx.db.patch(user._id, {
        email: args.email,
        updatedAt: now(),
      });
    } else {
      // Create new user
      console.log("Creating new user with email:", args.email);
      await ctx.db.insert("users", {
        email: args.email,
        identitySubject: identity.subject,
        createdAt: now(),
        updatedAt: now(),
      });
    }

    return null;
  },
});

/**
 * Set user email (called after authentication is established)
 */
export const setUserEmail = mutation({
  args: {
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_identity", (q) =>
        q.eq("identitySubject", identity.subject),
      )
      .first();

    if (user) {
      // Update existing user's email
      await ctx.db.patch(user._id, {
        email: args.email,
        updatedAt: now(),
      });
    } else {
      // Create new user
      await ctx.db.insert("users", {
        email: args.email,
        identitySubject: identity.subject,
        createdAt: now(),
        updatedAt: now(),
      });
    }

    return null;
  },
});
