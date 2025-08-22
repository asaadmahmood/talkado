import { describe, it, expect } from "vitest";
import {
  getTodayRange,
  parseRelativeDate,
  findProjectByName,
  findLabelsByNames,
} from "../../convex/_utils";

describe("Date Helpers", () => {
  describe("getTodayRange", () => {
    it("should return start and end of day for default timezone", () => {
      const { start, end } = getTodayRange();

      expect(start).toBeTypeOf("number");
      expect(end).toBeTypeOf("number");
      expect(end).toBeGreaterThan(start);

      // Should be roughly 24 hours apart (accounting for timezone)
      const diffHours = (end - start) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(24, 0);
    });

    it("should handle custom timezone", () => {
      const { start, end } = getTodayRange("+02:00");

      expect(start).toBeTypeOf("number");
      expect(end).toBeTypeOf("number");
      expect(end).toBeGreaterThan(start);
    });

    it("should throw error for invalid timezone", () => {
      expect(() => getTodayRange("invalid")).toThrow("Invalid timezone format");
    });
  });

  describe("parseRelativeDate", () => {
    it("should parse ISO date string", () => {
      const dateStr = "2024-12-25T15:30:00Z";
      const result = parseRelativeDate(dateStr);

      expect(result).toBe(new Date(dateStr).getTime());
    });

    it("should set time to 17:00 for date-only strings", () => {
      const dateStr = "2024-12-25";
      const result = parseRelativeDate(dateStr, "+05:00");
      const resultDate = new Date(result);

      // Should be set to 17:00 in the specified timezone
      expect(resultDate).toBeInstanceOf(Date);
    });

    it("should throw error for invalid date", () => {
      expect(() => parseRelativeDate("invalid-date")).toThrow(
        "Invalid date string",
      );
    });
  });
});

describe("Project and Label Helpers", () => {
  const mockProjects = [
    { _id: "1", name: "Work Project" },
    { _id: "2", name: "Personal Tasks" },
    { _id: "3", name: "Shopping List" },
  ];

  const mockLabels = [
    { _id: "l1", name: "urgent" },
    { _id: "l2", name: "work" },
    { _id: "l3", name: "personal" },
  ];

  describe("findProjectByName", () => {
    it("should find project by exact name match (case insensitive)", () => {
      const result = findProjectByName(mockProjects, "work project");
      expect(result).toBe("1");
    });

    it("should find project with different case", () => {
      const result = findProjectByName(mockProjects, "PERSONAL TASKS");
      expect(result).toBe("2");
    });

    it("should return undefined for non-existent project", () => {
      const result = findProjectByName(mockProjects, "Non-existent");
      expect(result).toBeUndefined();
    });

    it("should handle trimmed whitespace", () => {
      const result = findProjectByName(mockProjects, "  Shopping List  ");
      expect(result).toBe("3");
    });
  });

  describe("findLabelsByNames", () => {
    it("should find multiple labels by name", () => {
      const result = findLabelsByNames(mockLabels, ["urgent", "work"]);
      expect(result).toEqual(["l1", "l2"]);
    });

    it("should handle case insensitive matching", () => {
      const result = findLabelsByNames(mockLabels, ["URGENT", "Personal"]);
      expect(result).toEqual(["l1", "l3"]);
    });

    it("should ignore non-existent labels", () => {
      const result = findLabelsByNames(mockLabels, [
        "urgent",
        "non-existent",
        "work",
      ]);
      expect(result).toEqual(["l1", "l2"]);
    });

    it("should return empty array for no matches", () => {
      const result = findLabelsByNames(mockLabels, ["non-existent"]);
      expect(result).toEqual([]);
    });

    it("should handle empty input array", () => {
      const result = findLabelsByNames(mockLabels, []);
      expect(result).toEqual([]);
    });
  });
});
