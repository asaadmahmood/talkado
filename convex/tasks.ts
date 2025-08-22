/**
 * Task management functions
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { now, generateSort, getTodayRange } from "./_utils";

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
 * List tasks due today (incomplete)
 */
export const listToday = query({
  args: {
    timezone: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      userId: v.string(),
      projectId: v.optional(v.id("projects")),
      title: v.string(),
      notes: v.optional(v.string()),
      priority: v.number(),
      due: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
      sort: v.number(),
      labelIds: v.array(v.id("labels")),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const { start, end } = getTodayRange(args.timezone);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("completedAt"), undefined),
          q.eq(q.field("deletedAt"), undefined),
          q.gte(q.field("due"), start),
          q.lte(q.field("due"), end),
        ),
      )
      .collect();

    // Sort: completed? last; priority asc; due time asc; sort asc
    return tasks.sort((a, b) => {
      // Priority ascending (1 is highest priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // Due time ascending
      if (a.due && b.due && a.due !== b.due) {
        return a.due - b.due;
      }

      // Sort field ascending
      return a.sort - b.sort;
    });
  },
});

/**
 * List all incomplete tasks for the user
 */
export const listAll = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      userId: v.string(),
      projectId: v.optional(v.id("projects")),
      title: v.string(),
      notes: v.optional(v.string()),
      priority: v.number(),
      due: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
      sort: v.number(),
      labelIds: v.array(v.id("labels")),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, _args) => {
    const userId = await getCurrentUserId(ctx);

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("completedAt"), undefined),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    // Sort by priority, then by due date, then by sort order
    return tasks.sort((a, b) => {
      // Priority ascending (1 is highest priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // Due date ascending (nulls last)
      if (a.due && b.due && a.due !== b.due) {
        return a.due - b.due;
      }
      if (a.due && !b.due) return -1;
      if (!a.due && b.due) return 1;

      // Sort field ascending
      return a.sort - b.sort;
    });
  },
});

/**
 * Get a single task by ID
 */
export const get = query({
  args: {
    taskId: v.id("tasks"),
  },
  returns: v.union(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      userId: v.string(),
      projectId: v.optional(v.id("projects")),
      title: v.string(),
      notes: v.optional(v.string()),
      priority: v.number(),
      due: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
      sort: v.number(),
      labelIds: v.array(v.id("labels")),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      return null;
    }

    return task;
  },
});

/**
 * List tasks for a specific project
 */
export const listByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  returns: v.array(
    v.object({
      _id: v.id("tasks"),
      _creationTime: v.number(),
      userId: v.string(),
      projectId: v.optional(v.id("projects")),
      title: v.string(),
      notes: v.optional(v.string()),
      priority: v.number(),
      due: v.optional(v.number()),
      completedAt: v.optional(v.number()),
      deletedAt: v.optional(v.number()),
      sort: v.number(),
      labelIds: v.array(v.id("labels")),
      createdAt: v.number(),
      updatedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      throw new Error("Project not found or not authorized");
    }

    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_user_and_project", (q) =>
        q.eq("userId", userId).eq("projectId", args.projectId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // Sort by sort order for project view (to allow reordering)
    return tasks.sort((a, b) => a.sort - b.sort);
  },
});

/**
 * Create a new task
 */
export const create = mutation({
  args: {
    title: v.string(),
    notes: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    priority: v.optional(v.number()),
    due: v.optional(v.number()),
    labelIds: v.optional(v.array(v.id("labels"))),
  },
  returns: v.id("tasks"),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    // Verify project ownership if projectId is provided
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || project.userId !== userId) {
        throw new Error("Project not found or not authorized");
      }
    }

    // Verify label ownership if labelIds are provided
    if (args.labelIds) {
      for (const labelId of args.labelIds) {
        const label = await ctx.db.get(labelId);
        if (!label || label.userId !== userId) {
          throw new Error(`Label not found or not authorized: ${labelId}`);
        }
      }
    }

    const timestamp = now();
    const taskId = await ctx.db.insert("tasks", {
      userId: userId,
      projectId: args.projectId,
      title: args.title.trim(),
      notes: args.notes?.trim(),
      priority: args.priority ?? 3,
      due: args.due,
      sort: generateSort(),
      labelIds: args.labelIds ?? [],
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return taskId;
  },
});

/**
 * Toggle task completion status
 */
export const toggleComplete = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.userId !== userId) {
      throw new Error("Not authorized");
    }

    const timestamp = now();
    await ctx.db.patch(args.taskId, {
      completedAt: task.completedAt ? undefined : timestamp,
      updatedAt: timestamp,
    });

    return null;
  },
});

/**
 * Update a task
 */
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    projectId: v.optional(v.union(v.id("projects"), v.null())),
    priority: v.optional(v.number()),
    due: v.optional(v.union(v.number(), v.null())),
    labelIds: v.optional(v.array(v.id("labels"))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.userId !== userId) {
      throw new Error("Not authorized");
    }

    const updates: any = {
      updatedAt: now(),
    };

    if (args.title !== undefined) {
      updates.title = args.title.trim();
    }

    if (args.notes !== undefined) {
      updates.notes = args.notes?.trim();
    }

    if (args.projectId !== undefined) {
      if (args.projectId) {
        const project = await ctx.db.get(args.projectId);
        if (!project || project.userId !== userId) {
          throw new Error("Project not found or not authorized");
        }
      }
      updates.projectId = args.projectId;
    }

    if (args.priority !== undefined) {
      if (args.priority < 1 || args.priority > 4) {
        throw new Error("Priority must be between 1 and 4");
      }
      updates.priority = args.priority;
    }

    if (args.due !== undefined) {
      updates.due = args.due;
    }

    if (args.labelIds !== undefined) {
      // Verify label ownership
      for (const labelId of args.labelIds) {
        const label = await ctx.db.get(labelId);
        if (!label || label.userId !== userId) {
          throw new Error(`Label not found or not authorized: ${labelId}`);
        }
      }
      updates.labelIds = args.labelIds;
    }

    await ctx.db.patch(args.taskId, updates);

    return null;
  },
});

/**
 * Reorder tasks within a project
 */
export const reorder = mutation({
  args: {
    taskIds: v.array(v.id("tasks")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const timestamp = now();

    // Update sort order for each task
    for (let i = 0; i < args.taskIds.length; i++) {
      const taskId = args.taskIds[i];
      const task = await ctx.db.get(taskId);

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      if (task.userId !== userId) {
        throw new Error("Not authorized");
      }

      await ctx.db.patch(taskId, {
        sort: i, // Use index as sort order
        updatedAt: timestamp,
      });
    }

    return null;
  },
});

/**
 * Soft delete a task
 */
export const remove = mutation({
  args: {
    taskId: v.id("tasks"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);

    const task = await ctx.db.get(args.taskId);
    if (!task) {
      throw new Error("Task not found");
    }

    if (task.userId !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.taskId, {
      deletedAt: now(),
      updatedAt: now(),
    });

    return null;
  },
});
