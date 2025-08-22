/**
 * Utility functions for TodosPlus app
 */

import { z } from "zod";

// Default timezone for the app (Asia/Karachi)
export const DEFAULT_TIMEZONE = "Asia/Karachi";

/**
 * Get the start and end of day for today in the given timezone
 */
export function getTodayRange(timezone: string = DEFAULT_TIMEZONE): {
  start: number;
  end: number;
} {
  const _now = new Date();

  // Handle both IANA timezone identifiers and offset formats
  let offsetMinutes = 0;

  if (timezone.includes("/")) {
    // IANA timezone identifier (e.g., "Asia/Karachi")
    try {
      // Get the timezone offset by creating a date in that timezone
      const userTime = new Date(
        _now.toLocaleString("en-US", { timeZone: timezone }),
      );
      const utcTime = new Date(
        _now.toLocaleString("en-US", { timeZone: "UTC" }),
      );
      offsetMinutes = (userTime.getTime() - utcTime.getTime()) / (1000 * 60);
    } catch (error) {
      console.warn(`Invalid IANA timezone: ${timezone}, falling back to UTC`);
      timezone = "UTC";
    }
  } else {
    // Offset format (e.g., "+05:00")
    const offsetMatch = timezone.match(/([+-])(\d{2}):(\d{2})/);
    if (!offsetMatch) {
      console.warn(`Invalid timezone format: ${timezone}, falling back to UTC`);
      timezone = "UTC";
    } else {
      const sign = offsetMatch[1] === "+" ? 1 : -1;
      const hours = parseInt(offsetMatch[2], 10);
      const minutes = parseInt(offsetMatch[3], 10);
      offsetMinutes = sign * (hours * 60 + minutes);
    }
  }

  // Get today's date in the user's timezone
  const userTime = new Date(_now.getTime() + offsetMinutes * 60 * 1000);

  // Start of day in user timezone
  const startOfDay = new Date(
    userTime.getFullYear(),
    userTime.getMonth(),
    userTime.getDate(),
  );
  const start = startOfDay.getTime() - offsetMinutes * 60 * 1000; // Convert back to UTC

  // End of day in user timezone
  const endOfDay = new Date(
    userTime.getFullYear(),
    userTime.getMonth(),
    userTime.getDate() + 1,
  );
  const end = endOfDay.getTime() - offsetMinutes * 60 * 1000 - 1; // Convert back to UTC

  return { start, end };
}

/**
 * Parse relative date string to timestamp in the given timezone
 */
export function parseRelativeDate(
  dateStr: string,
  timezone: string = DEFAULT_TIMEZONE,
): number {
  const _now = new Date();

  // Handle both IANA timezone identifiers and offset formats
  let offsetMinutes = 0;

  if (timezone.includes("/")) {
    // IANA timezone identifier (e.g., "Asia/Karachi")
    try {
      // Get the timezone offset by creating a date in that timezone
      const userTime = new Date(
        _now.toLocaleString("en-US", { timeZone: timezone }),
      );
      const utcTime = new Date(
        _now.toLocaleString("en-US", { timeZone: "UTC" }),
      );
      offsetMinutes = (userTime.getTime() - utcTime.getTime()) / (1000 * 60);
    } catch (error) {
      console.warn(`Invalid IANA timezone: ${timezone}, falling back to UTC`);
      timezone = "UTC";
    }
  } else {
    // Offset format (e.g., "+05:00")
    const offsetMatch = timezone.match(/([+-])(\d{2}):(\d{2})/);
    if (!offsetMatch) {
      console.warn(`Invalid timezone format: ${timezone}, falling back to UTC`);
      timezone = "UTC";
    } else {
      const sign = offsetMatch[1] === "+" ? 1 : -1;
      const hours = parseInt(offsetMatch[2], 10);
      const minutes = parseInt(offsetMatch[3], 10);
      offsetMinutes = sign * (hours * 60 + minutes);
    }
  }

  // If it's just a date (no time), set to 17:00 local time
  const hasTime = /\d{1,2}:\d{2}/.test(dateStr);

  let targetDate: Date;

  targetDate = new Date(dateStr);

  // Check if the date is valid
  if (isNaN(targetDate.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }

  if (!hasTime) {
    // Set to 17:00 in user's timezone
    const userTime = new Date(targetDate.getTime() + offsetMinutes * 60 * 1000);
    userTime.setHours(17, 0, 0, 0);
    targetDate = new Date(userTime.getTime() - offsetMinutes * 60 * 1000);
  }

  return targetDate.getTime();
}

/**
 * Find project ID by name (case-insensitive)
 */
export function findProjectByName(
  projectCatalog: Array<{ _id: string; name: string }>,
  projectHint: string,
): string | undefined {
  const normalizedHint = projectHint.toLowerCase().trim();
  return projectCatalog.find(
    (p) => p.name.toLowerCase().trim() === normalizedHint,
  )?._id;
}

/**
 * Find label IDs by names (case-insensitive)
 */
export function findLabelsByNames(
  labelCatalog: Array<{ _id: string; name: string }>,
  labelNames: string[],
): string[] {
  const normalizedNames = labelNames.map((name) => name.toLowerCase().trim());
  return labelCatalog
    .filter((label) =>
      normalizedNames.includes(label.name.toLowerCase().trim()),
    )
    .map((label) => label._id);
}

// Zod schema for AI task creation validation
export const CreateTaskSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string().max(300),
      notes: z.string().optional(),
      project_hint: z.string().optional(),
      labels: z.array(z.string()).optional().default([]),
      priority: z.number().int().min(1).max(4).optional().default(3),
      due: z.string().datetime().optional(),
    }),
  ),
});

export type CreateTasksInput = z.infer<typeof CreateTaskSchema>;

/**
 * Get current timestamp
 */
export function now(): number {
  return Date.now();
}

/**
 * Generate sort value for new items (higher number = later in order)
 */
export function generateSort(): number {
  return Date.now();
}
