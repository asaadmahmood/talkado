// Comprehensive date patterns for natural language date detection
// This file contains all the regex patterns used to detect dates in task input

export const DATE_PATTERNS = {
  // Relative dates
  RELATIVE: [
    /\b(today|tonight)\b/gi,
    /\b(tomorrow|tmr|tmrw)\b/gi,
    /\b(yesterday|yday)\b/gi,
    /\b(next week|this week|last week)\b/gi,
    /\b(next month|this month|last month)\b/gi,
    /\b(next year|this year|last year)\b/gi,
    /\b(in \d+ days?)\b/gi,
    /\b(in \d+ weeks?)\b/gi,
    /\b(in \d+ months?)\b/gi,
    /\b(\d+ days? from now)\b/gi,
    /\b(\d+ weeks? from now)\b/gi,
    /\b(\d+ months? from now)\b/gi,
  ],

  // Weekdays
  WEEKDAYS: [
    /\b(monday|mon)\b/gi,
    /\b(tuesday|tue|tues)\b/gi,
    /\b(wednesday|wed)\b/gi,
    /\b(thursday|thu|thurs)\b/gi,
    /\b(friday|fri)\b/gi,
    /\b(saturday|sat)\b/gi,
    /\b(sunday|sun)\b/gi,
    /\b(next monday|next tuesday|next wednesday|next thursday|next friday|next saturday|next sunday)\b/gi,
    /\b(this monday|this tuesday|this wednesday|this thursday|this friday|this saturday|this sunday)\b/gi,
    /\b(last monday|last tuesday|last wednesday|last thursday|last friday|last saturday|last sunday)\b/gi,
  ],

  // Month names (full and abbreviated)
  MONTHS: [
    /\b(january|jan)\b/gi,
    /\b(february|feb)\b/gi,
    /\b(march|mar)\b/gi,
    /\b(april|apr)\b/gi,
    /\b(may)\b/gi,
    /\b(june|jun)\b/gi,
    /\b(july|jul)\b/gi,
    /\b(august|aug)\b/gi,
    /\b(september|sept|sep)\b/gi,
    /\b(october|oct)\b/gi,
    /\b(november|nov)\b/gi,
    /\b(december|dec)\b/gi,
  ],

  // Date formats with "on" prefix
  ON_PREFIX: [
    /\bon\s+(january|jan)\s+\d{1,2}\b/gi,
    /\bon\s+(february|feb)\s+\d{1,2}\b/gi,
    /\bon\s+(march|mar)\s+\d{1,2}\b/gi,
    /\bon\s+(april|apr)\s+\d{1,2}\b/gi,
    /\bon\s+may\s+\d{1,2}\b/gi,
    /\bon\s+(june|jun)\s+\d{1,2}\b/gi,
    /\bon\s+(july|jul)\s+\d{1,2}\b/gi,
    /\bon\s+(august|aug)\s+\d{1,2}\b/gi,
    /\bon\s+(september|sept|sep)\s+\d{1,2}\b/gi,
    /\bon\s+(october|oct)\s+\d{1,2}\b/gi,
    /\bon\s+(november|nov)\s+\d{1,2}\b/gi,
    /\bon\s+(december|dec)\s+\d{1,2}\b/gi,
    /\bon\s+\d{1,2}\s+(january|jan)\b/gi,
    /\bon\s+\d{1,2}\s+(february|feb)\b/gi,
    /\bon\s+\d{1,2}\s+(march|mar)\b/gi,
    /\bon\s+\d{1,2}\s+(april|apr)\b/gi,
    /\bon\s+\d{1,2}\s+may\b/gi,
    /\bon\s+\d{1,2}\s+(june|jun)\b/gi,
    /\bon\s+\d{1,2}\s+(july|jul)\b/gi,
    /\bon\s+\d{1,2}\s+(august|aug)\b/gi,
    /\bon\s+\d{1,2}\s+(september|sept|sep)\b/gi,
    /\bon\s+\d{1,2}\s+(october|oct)\b/gi,
    /\bon\s+\d{1,2}\s+(november|nov)\b/gi,
    /\bon\s+\d{1,2}\s+(december|dec)\b/gi,
  ],

  // Date formats without "on" prefix
  NO_PREFIX: [
    /\b(january|jan)\s+\d{1,2}\b/gi,
    /\b(february|feb)\s+\d{1,2}\b/gi,
    /\b(march|mar)\s+\d{1,2}\b/gi,
    /\b(april|apr)\s+\d{1,2}\b/gi,
    /\bmay\s+\d{1,2}\b/gi,
    /\b(june|jun)\s+\d{1,2}\b/gi,
    /\b(july|jul)\s+\d{1,2}\b/gi,
    /\b(august|aug)\s+\d{1,2}\b/gi,
    /\b(september|sept|sep)\s+\d{1,2}\b/gi,
    /\b(october|oct)\s+\d{1,2}\b/gi,
    /\b(november|nov)\s+\d{1,2}\b/gi,
    /\b(december|dec)\s+\d{1,2}\b/gi,
    /\b\d{1,2}\s+(january|jan)\b/gi,
    /\b\d{1,2}\s+(february|feb)\b/gi,
    /\b\d{1,2}\s+(march|mar)\b/gi,
    /\b\d{1,2}\s+(april|apr)\b/gi,
    /\b\d{1,2}\s+may\b/gi,
    /\b\d{1,2}\s+(june|jun)\b/gi,
    /\b\d{1,2}\s+(july|jul)\b/gi,
    /\b\d{1,2}\s+(august|aug)\b/gi,
    /\b\d{1,2}\s+(september|sept|sep)\b/gi,
    /\b\d{1,2}\s+(october|oct)\b/gi,
    /\b\d{1,2}\s+(november|nov)\b/gi,
    /\b\d{1,2}\s+(december|dec)\b/gi,
  ],

  // Numeric date formats
  NUMERIC: [
    /\b\d{1,2}\/\d{1,2}\b/g, // MM/DD or DD/MM
    /\b\d{1,2}-\d{1,2}\b/g, // MM-DD or DD-MM
    /\b\d{1,2}\.\d{1,2}\b/g, // MM.DD or DD.MM
    /\b\d{4}-\d{1,2}-\d{1,2}\b/g, // YYYY-MM-DD
    /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // MM/DD/YYYY or DD/MM/YYYY
    /\b\d{1,2}-\d{1,2}-\d{4}\b/g, // MM-DD-YYYY or DD-MM-YYYY
  ],

  // Ordinal dates
  ORDINAL: [
    /\b\d{1,2}(st|nd|rd|th)\s+(january|jan)\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+(february|feb)\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+(march|mar)\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+(april|apr)\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+may\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+(june|jun)\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+(july|jul)\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+(august|aug)\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+(september|sept|sep)\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+(october|oct)\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+(november|nov)\b/gi,
    /\b\d{1,2}(st|nd|rd|th)\s+(december|dec)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(january|jan)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(february|feb)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(march|mar)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(april|apr)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+may\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(june|jun)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(july|jul)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(august|aug)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(september|sept|sep)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(october|oct)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(november|nov)\b/gi,
    /\bon\s+\d{1,2}(st|nd|rd|th)\s+(december|dec)\b/gi,
  ],

  // Time-based patterns
  TIME: [
    /\b\d{1,2}:\d{2}\s*(am|pm)\b/gi, // 3:30 PM, 9:00 AM
    /\b\d{1,2}:\d{2}\b/g, // 15:30, 09:00
    /\b(at\s+\d{1,2}:\d{2})\b/gi, // at 3:30 PM
    /\b(by\s+\d{1,2}:\d{2})\b/gi, // by 3:30 PM
  ],

  // Special patterns
  SPECIAL: [
    /\b(end of month|eom)\b/gi,
    /\b(beginning of month|bom)\b/gi,
    /\b(mid month)\b/gi,
    /\b(end of week|eow)\b/gi,
    /\b(beginning of week|bow)\b/gi,
    /\b(mid week)\b/gi,
    /\b(end of year|eoy)\b/gi,
    /\b(beginning of year|boy)\b/gi,
    /\b(mid year)\b/gi,
    /\b(quarter end|q1|q2|q3|q4)\b/gi,
  ],
};

// Function to get all date patterns as a single regex
export function getAllDatePatterns(): RegExp {
  const allPatterns: string[] = [];

  Object.values(DATE_PATTERNS).forEach((category) => {
    category.forEach((pattern) => {
      // Extract the pattern string and remove the flags
      const patternStr = pattern.source;
      allPatterns.push(patternStr);
    });
  });

  // Combine all patterns with OR operator
  const combinedPattern = allPatterns.join("|");
  return new RegExp(combinedPattern, "gi");
}

// Function to get patterns by category
export function getDatePatternsByCategory(
  category: keyof typeof DATE_PATTERNS,
): RegExp[] {
  return DATE_PATTERNS[category];
}

// Export individual categories for specific use cases
export const {
  RELATIVE,
  WEEKDAYS,
  MONTHS,
  ON_PREFIX,
  NO_PREFIX,
  NUMERIC,
  ORDINAL,
  TIME,
  SPECIAL,
} = DATE_PATTERNS;
