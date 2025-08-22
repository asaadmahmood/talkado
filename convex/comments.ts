import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("comments")
      .withIndex("by_task_and_created", (q) => q.eq("taskId", args.taskId))
      .order("asc")
      .collect();
  },
});

export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    // Verify the task belongs to this user
    const task = await ctx.db.get(args.taskId);
    if (!task || task.userId !== userId) {
      throw new Error("Task not found or unauthorized");
    }

    const now = Date.now();
    return await ctx.db.insert("comments", {
      userId,
      taskId: args.taskId,
      content: args.content,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("comments"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const comment = await ctx.db.get(args.id);
    if (!comment || comment.userId !== userId) {
      throw new Error("Comment not found or unauthorized");
    }

    await ctx.db.patch(args.id, {
      content: args.content,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("comments") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const comment = await ctx.db.get(args.id);
    if (!comment || comment.userId !== userId) {
      throw new Error("Comment not found or unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});
