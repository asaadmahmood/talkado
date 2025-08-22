/**
 * AI task capture action using OpenAI function calling
 */

"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { File } from "node:buffer";
import { CreateTaskSchema, DEFAULT_TIMEZONE } from "./_utils";

// Polyfill File global for OpenAI SDK
if (!globalThis.File) {
  globalThis.File = File as any;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Action to transcribe audio using OpenAI Whisper
export const transcribe = action({
  args: {
    audioBase64: v.string(),
  },
  returns: v.object({
    text: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(args.audioBase64, "base64");

      // Create audio file using the polyfilled File global
      const audioFile = new File([audioBuffer], "audio.webm", {
        type: "audio/webm",
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile as any, // Cast to bypass Node.js/DOM File type mismatch
        model: "whisper-1",
        language: "en",
      });

      return { text: transcription.text };
    } catch (error) {
      console.error("Transcription failed:", error);
      throw new Error(
        `Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});

export const capture = action({
  args: {
    utterance: v.string(),
    projectCatalog: v.array(v.string()),
    labelCatalog: v.array(v.string()),
    timezone: v.optional(v.string()),
  },
  returns: v.object({
    tasks: v.array(
      v.object({
        title: v.string(),
        notes: v.optional(v.string()),
        project_hint: v.optional(v.string()),
        labels: v.array(v.string()),
        priority: v.number(),
        due: v.optional(v.string()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    let timezone = args.timezone || DEFAULT_TIMEZONE;

    // Validate and sanitize timezone
    if (timezone.includes("/")) {
      // IANA timezone identifier - validate it
      try {
        new Date().toLocaleDateString("en-US", { timeZone: timezone });
      } catch (error) {
        console.warn(`Invalid IANA timezone: ${timezone}, falling back to UTC`);
        timezone = "UTC";
      }
    } else if (timezone.match(/^[+-]\d{2}:\d{2}$/)) {
      // Offset format - convert to IANA timezone or use UTC
      console.warn(
        `Offset timezone format not supported: ${timezone}, falling back to UTC`,
      );
      timezone = "UTC";
    } else {
      console.warn(`Invalid timezone format: ${timezone}, falling back to UTC`);
      timezone = "UTC";
    }

    // Get current date in user's timezone for AI context
    const now = new Date();
    const currentISODate = now.toISOString();

    const systemPrompt = `You are a task management assistant that converts natural language into structured TODOs.

CURRENT TIME: ${currentISODate} (timezone: ${timezone})

RULES:
- Convert user input into structured tasks (no subtasks/attachments)
- For due dates, generate EXACT ISO 8601 datetime strings (YYYY-MM-DDTHH:mm:ss.sssZ)
- CRITICAL: Be very precise with date interpretation based on context:
  * If user says "Monday" and today is Friday, that means NEXT Monday
  * If user says "on Monday" or "Monday" in a future context, calculate the correct Monday
  * If user says "next week on Monday", that's Monday of the following week
  * If user mentions "next week" for anything, add 7+ days appropriately
  * If user says "this Friday" or just "Friday" in current week context, use THIS Friday
  * If user says "next Friday", use NEXT Friday
  * When in doubt about "this" vs "next", prefer "this" week unless context suggests otherwise
- Time defaults:
  * Morning times: 09:00 local time
  * Afternoon/evening: 17:00 local time
  * No time specified: 17:00 local time
- Date calculation examples:
  * Current date: ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: timezone })}
  * "Friday" = this Friday at 17:00 local time (unless today is Friday, then next Friday)
  * "next Friday" = next Friday at 17:00 local time
  * "Monday morning" = next Monday at 09:00 local time
  * "tomorrow" = ${new Date(now.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: timezone })} at 17:00
- Keep titles under 120 characters; put overflow content in notes
- Prefer existing project/label names from provided catalogs
- Use project_hint only if you're unsure about exact project match
- Priority scale: 1 (highest) to 4 (lowest), default 3
- Return only via the function call, no additional text

AVAILABLE PROJECTS: ${args.projectCatalog.join(", ")}
AVAILABLE LABELS: ${args.labelCatalog.join(", ")}

Convert the user's input into structured tasks using the create_tasks function.`;

    const tools = [
      {
        type: "function" as const,
        function: {
          name: "create_tasks",
          description: "Create structured tasks from natural language input",
          parameters: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  required: ["title"],
                  properties: {
                    title: {
                      type: "string",
                      maxLength: 300,
                      description: "Task title (keep under 120 chars)",
                    },
                    notes: {
                      type: "string",
                      description: "Additional details or overflow from title",
                    },
                    project_hint: {
                      type: "string",
                      description:
                        "Project name hint if not exactly matching catalog",
                    },
                    labels: {
                      type: "array",
                      items: { type: "string" },
                      description: "Array of label names",
                    },
                    priority: {
                      type: "integer",
                      minimum: 1,
                      maximum: 4,
                      description: "Priority level (1=highest, 4=lowest)",
                    },
                    due: {
                      type: "string",
                      format: "date-time",
                      description: "Due date in ISO 8601 format",
                    },
                  },
                  additionalProperties: false,
                },
              },
            },
            required: ["tasks"],
            additionalProperties: false,
          },
        },
      },
    ];

    let attempt = 0;
    const maxAttempts = 2;

    while (attempt < maxAttempts) {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: args.utterance },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "create_tasks" } },
          temperature: 0.3,
        });

        const toolCall = completion.choices[0]?.message?.tool_calls?.[0];
        if (
          !toolCall ||
          toolCall.type !== "function" ||
          !toolCall.function ||
          toolCall.function.name !== "create_tasks"
        ) {
          throw new Error("No valid function call received");
        }

        // Parse and validate the response
        let parsedArgs;
        try {
          parsedArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          throw new Error("Invalid JSON in function arguments");
        }

        // Validate with Zod
        const validatedInput = CreateTaskSchema.parse(parsedArgs);

        // Process dates and return the result
        const processedTasks = validatedInput.tasks.map((task) => ({
          ...task,
          priority: task.priority ?? 3,
          labels: task.labels ?? [],
          due: task.due
            ? new Date(task.due).toISOString() // AI should now generate valid ISO strings
            : undefined,
        }));

        return { tasks: processedTasks };
      } catch (error) {
        attempt++;

        if (attempt >= maxAttempts) {
          console.error("AI capture failed after retries:", error);
          throw new Error(
            `Failed to process task after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`,
          );
        }

        // If it was a validation _error, try again with more specific instructions
        if (
          error instanceof Error &&
          (error.message.includes("validation") ||
            error.message.includes("Invalid"))
        ) {
          const retryPrompt = `The previous response had validation errors. Please ensure:
- All tasks have a "title" field
- Priority is an integer between 1-4
- Dates are in valid ISO format
- Labels is an array of strings
- No additional properties beyond: title, notes, project_hint, labels, priority, due

Please try again with the user input: ${args.utterance}`;

          try {
            const retryCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: args.utterance },
                {
                  role: "assistant",
                  content: "I'll create valid structured tasks.",
                },
                { role: "user", content: retryPrompt },
              ],
              tools,
              tool_choice: {
                type: "function",
                function: { name: "create_tasks" },
              },
              temperature: 0.1,
            });

            const retryToolCall =
              retryCompletion.choices[0]?.message?.tool_calls?.[0];
            if (
              retryToolCall &&
              retryToolCall.type === "function" &&
              retryToolCall.function &&
              retryToolCall.function.name === "create_tasks"
            ) {
              const retryParsedArgs = JSON.parse(
                retryToolCall.function.arguments,
              );
              const retryValidatedInput =
                CreateTaskSchema.parse(retryParsedArgs);

              const retryProcessedTasks = retryValidatedInput.tasks.map(
                (task) => ({
                  ...task,
                  priority: task.priority ?? 3,
                  labels: task.labels ?? [],
                  due: task.due
                    ? new Date(task.due).toISOString() // AI should now generate valid ISO strings
                    : undefined,
                }),
              );

              return { tasks: retryProcessedTasks };
            }
          } catch (_retryError) {
            console.error("Retry also failed:", _retryError);
          }
        }
      }
    }

    throw new Error("Failed to process task input");
  },
});
