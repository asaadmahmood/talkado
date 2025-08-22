/**
 * Project management functions
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { now, generateSort } from "./_utils";

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
 * List all projects for the authenticated user (non-archived)
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("projects"),
      _creationTime: v.number(),
      userId: v.string(),
      name: v.string(),
      sort: v.number(),
      archivedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, _args) => {
    const userId = await getCurrentUserId(ctx);

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_user_and_archived", (q) =>
        q.eq("userId", userId).eq("archivedAt", undefined),
      )
      .order("asc")
      .collect();

    // Sort by sort field
    return projects.sort((a, b) => a.sort - b.sort);
  },
});

/**
 * Create a new project
 */
export const create = mutation({
  args: {
    name: v.string(),
  },
  returns: v.id("projects"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const timestamp = now();
    const projectId = await ctx.db.insert("projects", {
      userId: userId,
      name: args.name.trim(),
      sort: generateSort(),
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return projectId;
  },
});

/**
 * Update a project name
 */
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.projectId, {
      name: args.name.trim(),
      updatedAt: now(),
    });

    return null;
  },
});

/**
 * Archive a project
 */
export const archive = mutation({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    if (project.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.projectId, {
      archivedAt: now(),
      updatedAt: now(),
    });

    return null;
  },
});

/**
 * Reorder projects
 */
export const reorder = mutation({
  args: {
    projectIds: v.array(v.id("projects")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const timestamp = now();

    // Update sort order for each project
    for (let i = 0; i < args.projectIds.length; i++) {
      const projectId = args.projectIds[i];
      const project = await ctx.db.get(projectId);

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      if (project.userId !== userId) {
        throw new Error("Not authorized");
      }

      await ctx.db.patch(projectId, {
        sort: i, // Use index as sort order
        updatedAt: timestamp,
      });
    }

    return null;
  },
});
