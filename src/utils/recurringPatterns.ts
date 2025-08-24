// Recurring task patterns and parsing utilities

export interface RecurringPattern {
  type: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  dayOfWeek?: number; // 0-6 for Sunday-Saturday
  dayOfMonth?: number; // 1-31
  time?: number; // minutes since midnight
}

// Recurring patterns to detect in natural language
export const RECURRING_PATTERNS = {
  // Daily patterns
  DAILY: [
    /\b(every day|daily|each day|everyday)\b/gi,
    /\b(every \d+ days?)\b/gi,
    /\b(each \d+ days?)\b/gi,
    /\b(\d+ days? apart)\b/gi,
  ],

  // Weekly patterns
  WEEKLY: [
    /\b(every week|weekly|each week)\b/gi,
    /\b(every \d+ weeks?)\b/gi,
    /\b(each \d+ weeks?)\b/gi,
    /\b(\d+ weeks? apart)\b/gi,
    /\b(every (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi,
    /\b(each (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi,
    /\b(on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?)\b/gi,
  ],

  // Monthly patterns
  MONTHLY: [
    /\b(every month|monthly|each month)\b/gi,
    /\b(every \d+ months?)\b/gi,
    /\b(each \d+ months?)\b/gi,
    /\b(\d+ months? apart)\b/gi,
    /\b(every (\d{1,2})(st|nd|rd|th)?)\b/gi, // every 15th, every 27th
    /\b(each (\d{1,2})(st|nd|rd|th)?)\b/gi, // each 15th, each 27th
    /\b(on the (\d{1,2})(st|nd|rd|th)?)\b/gi, // on the 15th, on the 27th
  ],

  // Yearly patterns
  YEARLY: [
    /\b(every year|yearly|each year|annually)\b/gi,
    /\b(every \d+ years?)\b/gi,
    /\b(each \d+ years?)\b/gi,
    /\b(\d+ years? apart)\b/gi,
  ],
};

// Function to parse recurring patterns from text
export function parseRecurringPattern(text: string): RecurringPattern | null {
  const lowerText = text.toLowerCase();

  // Daily patterns
  const dailyMatch = lowerText.match(/\b(every day|daily|each day|everyday)\b/);
  if (dailyMatch) {
    return { type: "daily", interval: 1 };
  }

  const dailyIntervalMatch = lowerText.match(
    /\b(every|each)\s+(\d+)\s+days?\b/,
  );
  if (dailyIntervalMatch) {
    return { type: "daily", interval: parseInt(dailyIntervalMatch[2]) };
  }

  // Weekly patterns
  const weeklyMatch = lowerText.match(/\b(every week|weekly|each week)\b/);
  if (weeklyMatch) {
    return { type: "weekly", interval: 1 };
  }

  const weeklyIntervalMatch = lowerText.match(
    /\b(every|each)\s+(\d+)\s+weeks?\b/,
  );
  if (weeklyIntervalMatch) {
    return { type: "weekly", interval: parseInt(weeklyIntervalMatch[2]) };
  }

  // Specific weekday patterns - only match "every" and "each" for recurring
  const weekdayMatch = lowerText.match(
    /\b(every|each)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/,
  );
  if (weekdayMatch) {
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    return {
      type: "weekly",
      interval: 1,
      dayOfWeek: dayMap[weekdayMatch[2]],
    };
  }

  // Monthly patterns
  const monthlyMatch = lowerText.match(/\b(every month|monthly|each month)\b/);
  if (monthlyMatch) {
    return { type: "monthly", interval: 1 };
  }

  const monthlyIntervalMatch = lowerText.match(
    /\b(every|each)\s+(\d+)\s+months?\b/,
  );
  if (monthlyIntervalMatch) {
    return { type: "monthly", interval: parseInt(monthlyIntervalMatch[2]) };
  }

  // Specific day of month patterns
  const dayOfMonthMatch = lowerText.match(
    /\b(every|each|on the)\s+(\d{1,2})(st|nd|rd|th)?\b/,
  );
  if (dayOfMonthMatch) {
    const day = parseInt(dayOfMonthMatch[2]);
    if (day >= 1 && day <= 31) {
      return {
        type: "monthly",
        interval: 1,
        dayOfMonth: day,
      };
    }
  }

  // Yearly patterns
  const yearlyMatch = lowerText.match(
    /\b(every year|yearly|each year|annually)\b/,
  );
  if (yearlyMatch) {
    return { type: "yearly", interval: 1 };
  }

  const yearlyIntervalMatch = lowerText.match(
    /\b(every|each)\s+(\d+)\s+years?\b/,
  );
  if (yearlyIntervalMatch) {
    return { type: "yearly", interval: parseInt(yearlyIntervalMatch[2]) };
  }

  return null;
}

// Function to calculate next due date based on recurring pattern
export function calculateNextDueDate(
  currentDueDate: Date,
  pattern: RecurringPattern,
  completedDate?: Date,
): Date {
  const baseDate = completedDate || currentDueDate;
  const nextDate = new Date(baseDate);

  switch (pattern.type) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + pattern.interval);
      break;

    case "weekly":
      if (pattern.dayOfWeek !== undefined) {
        // Find next occurrence of specific day of week
        const currentDay = nextDate.getDay();
        let daysToAdd = pattern.dayOfWeek - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7;
        nextDate.setDate(nextDate.getDate() + daysToAdd);
      } else {
        nextDate.setDate(nextDate.getDate() + 7 * pattern.interval);
      }
      break;

    case "monthly":
      if (pattern.dayOfMonth !== undefined) {
        // Set to specific day of month
        nextDate.setDate(pattern.dayOfMonth);
        // If we've passed this day this month, go to next month
        if (nextDate <= baseDate) {
          nextDate.setMonth(nextDate.getMonth() + 1);
          nextDate.setDate(pattern.dayOfMonth);
        }
      } else {
        nextDate.setMonth(nextDate.getMonth() + pattern.interval);
      }
      break;

    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + pattern.interval);
      break;
  }

  // Preserve time if specified
  if (pattern.time !== undefined) {
    const hours = Math.floor(pattern.time / 60);
    const minutes = pattern.time % 60;
    nextDate.setHours(hours, minutes, 0, 0);
  }

  return nextDate;
}

// Function to extract time from text
export function parseTimeFromText(text: string): number | null {
  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const ampm = timeMatch[3]?.toLowerCase();

    if (ampm === "pm" && hours !== 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }
  return null;
}

// Function to clean text by removing recurring patterns
export function cleanRecurringText(text: string): string {
  let cleaned = text;

  // Remove recurring patterns
  cleaned = cleaned.replace(/\b(every day|daily|each day|everyday)\b/gi, "");
  cleaned = cleaned.replace(/\b(every \d+ days?)\b/gi, "");
  cleaned = cleaned.replace(/\b(each \d+ days?)\b/gi, "");
  cleaned = cleaned.replace(/\b(every week|weekly|each week)\b/gi, "");
  cleaned = cleaned.replace(/\b(every \d+ weeks?)\b/gi, "");
  cleaned = cleaned.replace(/\b(each \d+ weeks?)\b/gi, "");
  cleaned = cleaned.replace(/\b(every month|monthly|each month)\b/gi, "");
  cleaned = cleaned.replace(/\b(every \d+ months?)\b/gi, "");
  cleaned = cleaned.replace(/\b(each \d+ months?)\b/gi, "");
  cleaned = cleaned.replace(/\b(every year|yearly|each year|annually)\b/gi, "");
  cleaned = cleaned.replace(/\b(every \d+ years?)\b/gi, "");
  cleaned = cleaned.replace(/\b(each \d+ years?)\b/gi, "");

  // Remove specific day patterns
  cleaned = cleaned.replace(
    /\b(every|each|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?\b/gi,
    "",
  );
  cleaned = cleaned.replace(
    /\b(every|each|on the)\s+(\d{1,2})(st|nd|rd|th)?\b/gi,
    "",
  );

  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  return cleaned;
}

// Function to get all recurring patterns as a single regex
export function getAllRecurringPatterns(): RegExp {
  const allPatterns: string[] = [];

  Object.values(RECURRING_PATTERNS).forEach((category) => {
    category.forEach((pattern) => {
      const patternStr = pattern.source;
      allPatterns.push(patternStr);
    });
  });

  const combinedPattern = allPatterns.join("|");
  return new RegExp(combinedPattern, "gi");
}
