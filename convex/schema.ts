import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    identitySubject: v.optional(v.string()), // Optional to handle existing data
    timezone: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_identity", ["identitySubject"]),

  projects: defineTable({
    userId: v.string(), // Keep as string for backward compatibility
    name: v.string(),
    sort: v.number(),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_archived", ["userId", "archivedAt"]),

  labels: defineTable({
    userId: v.string(), // Keep as string for backward compatibility
    name: v.string(),
    color: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),

  tasks: defineTable({
    userId: v.string(), // Keep as string for backward compatibility
    projectId: v.optional(v.id("projects")),
    title: v.string(),
    notes: v.optional(v.string()),
    priority: v.optional(v.number()), // 1-3, optional
    due: v.optional(v.number()), // timestamp
    completedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    sort: v.number(),
    kanbanColumn: v.optional(v.string()), // Temporary: for existing data cleanup
    labelIds: v.array(v.id("labels")),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Recurring task fields
    isRecurring: v.optional(v.boolean()),
    recurringPattern: v.optional(v.string()), // e.g., "daily", "weekly", "monthly", "yearly"
    recurringInterval: v.optional(v.number()), // e.g., 1 for every day, 2 for every 2 days
    recurringDayOfWeek: v.optional(v.number()), // 0-6 for Sunday-Saturday (for weekly)
    recurringDayOfMonth: v.optional(v.number()), // 1-31 for monthly
    recurringTime: v.optional(v.number()), // time in minutes since midnight
    nextDueDate: v.optional(v.number()), // calculated next due date
    originalDueDate: v.optional(v.number()), // original due date for recurring tasks
  })
    .index("by_user", ["userId"])
    .index("by_user_and_project", ["userId", "projectId"])
    .index("by_user_and_due", ["userId", "due"])
    .index("by_user_and_updated", ["userId", "updatedAt"])
    .index("by_user_and_completed", ["userId", "completedAt"])
    .index("by_user_and_deleted", ["userId", "deletedAt"]),

  comments: defineTable({
    userId: v.string(), // Keep as string for backward compatibility
    taskId: v.id("tasks"),
    content: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_task_and_created", ["taskId", "createdAt"]),
});
