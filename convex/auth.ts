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
      timezone: v.optional(v.string()),
      profileImageUrl: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    console.log("server identity", await ctx.auth.getUserIdentity());

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
        timezone: user.timezone,
        profileImageUrl: user.profileImageUrl,
      };
    }

    // If no user found, return identity with empty email
    // Note: We can't create a user here because this is a query, not a mutation
    return {
      subject: identity.subject,
      email: "",
      name: undefined,
      timezone: undefined,
      profileImageUrl: undefined,
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

    // Check if user already exists by identity subject
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_identity", (q) =>
        q.eq("identitySubject", identity.subject),
      )
      .first();

    console.log("Existing user found by identity:", existingUser);

    if (existingUser) {
      // Update existing user's email if it's different
      if (existingUser.email !== args.email) {
        console.log("Updating existing user with new email:", args.email);
        await ctx.db.patch(existingUser._id, {
          email: args.email,
          updatedAt: now(),
        });
      } else {
        console.log("User already has the same email, no update needed");
      }
    } else {
      // Also check if a user with this email already exists
      const userByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();

      if (userByEmail) {
        // Update the existing user with the new identity subject
        console.log("Found user by email, updating identity subject");
        await ctx.db.patch(userByEmail._id, {
          identitySubject: identity.subject,
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
    }

    return null;
  },
});

/**
 * Update user password
 */
export const updatePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // For now, we'll use a simple approach
    // In a real app, you'd want to verify the current password
    // and use proper password hashing

    // Note: This is a placeholder implementation
    // Convex Auth doesn't provide direct password update functionality
    // You would typically handle this through your auth provider's API

    throw new Error(
      "Password update not implemented yet. Please contact support.",
    );
  },
});

/**
 * Migration function to clean up duplicate users
 * Run this once to fix the existing data
 */
export const migrateUsers = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    console.log("Starting user migration...");

    // Get all users
    const allUsers = await ctx.db.query("users").collect();
    console.log(`Found ${allUsers.length} total users`);

    // Group users by email
    const usersByEmail = new Map<string, any[]>();
    for (const user of allUsers) {
      const email = user.email;
      if (!usersByEmail.has(email)) {
        usersByEmail.set(email, []);
      }
      usersByEmail.get(email)!.push(user);
    }

    // Process each email group
    for (const [email, users] of usersByEmail) {
      if (users.length > 1) {
        console.log(`Found ${users.length} users for email: ${email}`);

        // Find the user with the most complete data (has identitySubject)
        const userWithIdentity = users.find((u) => u.identitySubject);
        const userToKeep = userWithIdentity || users[0];

        console.log(`Keeping user: ${userToKeep._id}`);

        // Delete the other users
        for (const user of users) {
          if (user._id !== userToKeep._id) {
            console.log(`Deleting duplicate user: ${user._id}`);
            await ctx.db.delete(user._id);
          }
        }
      }
    }

    console.log("User migration completed");
    return null;
  },
});

/**
 * Debug function to check current user state
 */
export const debugUserState = query({
  args: {},
  returns: v.object({
    identity: v.union(
      v.object({
        subject: v.string(),
        tokenIdentifier: v.string(),
        issuer: v.string(),
      }),
      v.null(),
    ),
    users: v.array(
      v.object({
        _id: v.id("users"),
        email: v.string(),
        identitySubject: v.optional(v.string()),
        name: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const allUsers = await ctx.db.query("users").collect();

    return {
      identity,
      users: allUsers.map((u) => ({
        _id: u._id,
        email: u.email,
        identitySubject: u.identitySubject,
        name: u.name,
      })),
    };
  },
});

/**
 * Ensure user record exists for current identity
 */
export const ensureUserExists = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_identity", (q) =>
        q.eq("identitySubject", identity.subject),
      )
      .first();

    if (!existingUser) {
      // Create a new user record
      console.log("Creating new user for identity:", identity.subject);
      await ctx.db.insert("users", {
        email: "", // Will be set later
        identitySubject: identity.subject,
        createdAt: now(),
        updatedAt: now(),
      });
    }

    return null;
  },
});
