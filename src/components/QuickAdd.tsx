import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Mic, Sparkles, Plus, Flag, Calendar, Repeat } from "lucide-react";
import { getAllDatePatterns } from "../utils/datePatterns";
import { parseRecurringPattern, cleanRecurringText, parseTimeFromText, getAllRecurringPatterns } from "../utils/recurringPatterns";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { useTaskSelection } from "../contexts/TaskSelectionContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";


// Date patterns to highlight like Todoist - Only very clear date intentions
const DATE_PATTERNS = [
    // Relative dates (clear date intentions)
    /\b(today|tomorrow|yesterday)\b/gi,
    /\b(next week|this week|last week)\b/gi,
    /\b(next month|this month|last month)\b/gi,

    // Weekdays with clear context
    /\b(next|this|last)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\b(next|this|last)\s+(mon|tue|wed|thu|fri|sat|sun)\b/gi,

    // Clear numeric date formats only
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/gi,
    /\b(\d{1,2}-\d{1,2}-\d{2,4})\b/gi,

    // Relative time expressions (clear date intentions)
    /\b(in \d+ days?|in \d+ weeks?|in \d+ months?)\b/gi,

    // Only dates at the beginning or end of text (likely intentional)
    /^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi,
    /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/gi,
    /^(\d{1,2})(st|nd|rd|th)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi,
    /\b(\d{1,2})(st|nd|rd|th)\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/gi,

    // Recurring patterns
    /\b(every day|daily|each day)\b/gi,
    /\b(every \d+ days?)\b/gi,
    /\b(every week|weekly|each week)\b/gi,
    /\b(every \d+ weeks?)\b/gi,
    /\b(every month|monthly|each month)\b/gi,
    /\b(every \d+ months?)\b/gi,
    /\b(every year|yearly|each year|annually)\b/gi,
    /\b(every \d+ years?)\b/gi,
    /\b(every (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi,
    /\b(each (monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b/gi,
    /\b(on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)s?)\b/gi,
    /\b(every (\d{1,2})(st|nd|rd|th)?)\b/gi,
    /\b(each (\d{1,2})(st|nd|rd|th)?)\b/gi,
    /\b(on the (\d{1,2})(st|nd|rd|th)?)\b/gi,
];

// Function to detect and highlight date patterns in text
function highlightDates(text: string): { hasDate: boolean; highlighted: React.ReactNode[] } {
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let foundDates = false;

    // Check for recurring patterns first
    const recurringPattern = getAllRecurringPatterns();
    let recurringMatch;
    while ((recurringMatch = recurringPattern.exec(text)) !== null) {
        foundDates = true;
        // Add text before the match
        if (recurringMatch.index > lastIndex) {
            elements.push(text.slice(lastIndex, recurringMatch.index));
        }
        // Add the recurring pattern with special styling
        elements.push(
            <span key={`recurring-${recurringMatch.index}`} className="bg-purple-100 text-purple-800 px-1 rounded">
                {recurringMatch[0]}
                <Repeat className="inline h-3 w-3 ml-1" />
            </span>
        );
        lastIndex = recurringMatch.index + recurringMatch[0].length;
    }

    // Check for regular date patterns
    const datePattern = getAllDatePatterns();
    let dateMatch;
    while ((dateMatch = datePattern.exec(text)) !== null) {
        // Skip if this was already matched as a recurring pattern
        if (dateMatch.index >= lastIndex) {
            foundDates = true;
            // Add text before the match
            if (dateMatch.index > lastIndex) {
                elements.push(text.slice(lastIndex, dateMatch.index));
            }
            // Add the date pattern
            elements.push(
                <span key={`date-${dateMatch.index}`} className="bg-blue-100 text-blue-800 px-1 rounded">
                    {dateMatch[0]}
                    <Calendar className="inline h-3 w-3 ml-1" />
                </span>
            );
            lastIndex = dateMatch.index + dateMatch[0].length;
        }
    }

    // Add remaining text
    if (lastIndex < text.length) {
        elements.push(text.slice(lastIndex));
    }

    return { hasDate: foundDates, highlighted: elements };
}

// Simple programmatic date parsing for text input (no AI needed)
function parseSimpleDate(text: string): Date | null {
    const today = new Date();
    const lowerText = text.toLowerCase().trim();

    // Handle relative dates
    if (lowerText.includes('today')) {
        return today;
    }
    if (lowerText.includes('tomorrow')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow;
    }
    if (lowerText.includes('yesterday')) {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return yesterday;
    }

    // Handle "12 aug" or "12th aug" patterns at start or end
    const dateAtStart = lowerText.match(/^(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);
    const dateAtEnd = lowerText.match(/(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/);

    const dateMatch = dateAtStart || dateAtEnd;
    if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const monthStr = dateMatch[3];

        const monthMap: Record<string, number> = {
            'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
            'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11
        };

        const month = monthMap[monthStr];
        if (month !== undefined) {
            const year = today.getFullYear();
            const parsedDate = new Date(year, month, day);

            // If date is in the past, assume next year
            if (parsedDate < today) {
                parsedDate.setFullYear(year + 1);
            }

            return parsedDate;
        }
    }

    return null;
}

interface QuickAddProps {
    focused: boolean;
    onFocusChange: (focused: boolean) => void;
    projectId?: Id<"projects">;
}

export default function QuickAdd({ focused, onFocusChange, projectId }: QuickAddProps) {
    const [input, setInput] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const [recordingTime, setRecordingTime] = useState(0);
    const isCancelingRef = useRef(false);
    const navigate = useNavigate();
    const location = useLocation();

    const inputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const audioStreamRef = useRef<MediaStream | null>(null);
    const animationFrameId = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const recognitionRef = useRef<any>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const projects = useQuery(api.projects.list);
    const labels = useQuery(api.labels.list);
    const createTask = useMutation(api.tasks.create);
    const aiCapture = useAction(api.ai.capture);
    const transcribeAudio = useAction(api.ai.transcribe);
    const subscription = useQuery(api.stripe.getSubscription);
    const { openDetailsPanel } = useTaskSelection();

    // Function to navigate to task and open details
    const navigateToTask = (taskData: any) => {
        console.log('QuickAdd: Navigating to task with data:', taskData);

        // Store the task data in sessionStorage so the page can open it
        const taskId = taskData._id || taskData.id;
        console.log('QuickAdd: Storing task ID in sessionStorage:', taskId);
        sessionStorage.setItem('openTaskId', taskId);

        // Navigate to the correct page based on project
        if (taskData.projectId) {
            console.log('QuickAdd: Navigating to project:', taskData.projectId);
            // Check if we're already on the project page
            if (window.location.pathname === `/projects/${taskData.projectId}`) {
                // Dispatch a custom event to trigger task opening
                window.dispatchEvent(new CustomEvent('openTask', { detail: { taskId } }));
            } else {
                navigate(`/projects/${taskData.projectId}`);
            }
        } else {
            console.log('QuickAdd: Navigating to all tasks');
            // Check if we're already on the all tasks page
            if (window.location.pathname === '/all') {
                // Dispatch a custom event to trigger task opening
                window.dispatchEvent(new CustomEvent('openTask', { detail: { taskId } }));
            } else {
                navigate('/all');
            }
        }
    };

    // Focus input on Cmd/Ctrl+K
    useEffect(() => {
        if (focused && inputRef.current) {
            inputRef.current.focus();
            onFocusChange(false);
        }
    }, [focused, onFocusChange]);

    // Initialize MediaRecorder and SpeechRecognition
    useEffect(() => {
        // MediaRecorder setup
        if (typeof window !== "undefined") {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
        }

        // SpeechRecognition setup for live captions
        if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = "en-US";
            recognitionRef.current.maxAlternatives = 1;

            recognitionRef.current.onstart = () => {
                console.log("Speech recognition (captions) started");
            };

            recognitionRef.current.onresult = (event: any) => {
                let finalTranscript = "";
                let interimTranscript = "";

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    if (result.isFinal) {
                        finalTranscript += result[0].transcript;
                    } else {
                        interimTranscript += result[0].transcript;
                    }
                }

                if (finalTranscript) {
                    setTranscript(prev => (prev + " " + finalTranscript).trim());
                }
                setInterimTranscript(interimTranscript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.log("Live captions error (non-critical):", event.error);
            };

            recognitionRef.current.onend = () => {
                if (isRecording && mediaRecorderRef.current?.state === 'recording') {
                    setTimeout(() => {
                        if (recognitionRef.current && isRecording) {
                            try {
                                recognitionRef.current.start();
                            } catch (e) {
                                console.error("Failed to restart captions recognition:", e);
                            }
                        }
                    }, 100);
                }
            };
        }

        return () => {
            console.log("Component cleanup - stopping all recording resources");
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (audioStreamRef.current) {
                audioStreamRef.current.getTracks().forEach(track => track.stop());
            }
            const frameId = animationFrameId.current;
            if (frameId) {
                cancelAnimationFrame(frameId);
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (timerRef.current) {
                console.log("Final cleanup - clearing timer");
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on component unmount - intentionally not including isRecording to avoid timer cleanup

    // Function to parse hashtags and find projects
    const parseProjectFromInput = (inputText: string) => {
        const hashtagMatch = inputText.match(/#(\w+)/);
        if (hashtagMatch && projects) {
            const projectName = hashtagMatch[1].toLowerCase();
            const foundProject = projects.find(p =>
                p.name.toLowerCase() === projectName
            );
            return foundProject?._id;
        }
        return undefined;
    };

    // Function to clean input text (remove hashtags)
    const cleanInputText = (inputText: string) => {
        return inputText.replace(/#\w+/g, '').trim();
    };

    // Function to parse dates using comprehensive patterns
    const parseComprehensiveDate = (text: string): Date | null => {
        const dateRegex = getAllDatePatterns();
        const match = dateRegex.exec(text);

        if (!match) return null;

        const dateString = match[0].toLowerCase();
        const now = new Date();

        // Handle relative dates
        if (dateString.includes('today') || dateString.includes('tonight')) {
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        if (dateString.includes('tomorrow') || dateString.includes('tmr') || dateString.includes('tmrw')) {
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        }
        if (dateString.includes('yesterday') || dateString.includes('yday')) {
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        }

        // Handle "next week", "this week", etc.
        if (dateString.includes('next week')) {
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
        }
        if (dateString.includes('this week')) {
            // Find next occurrence of the current weekday
            const currentDay = now.getDay();
            const daysUntilNext = (7 - currentDay) % 7;
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNext);
        }
        if (dateString.includes('last week')) {
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        }

        // Handle weekdays
        const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const weekdayIndex = weekdays.findIndex(day => dateString.includes(day));
        if (weekdayIndex !== -1) {
            const currentDay = now.getDay();
            let daysToAdd = weekdayIndex - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToAdd);
        }

        // Handle "next monday", "this friday", etc.
        for (const weekday of weekdays) {
            if (dateString.includes(`next ${weekday}`)) {
                const targetDay = weekdays.indexOf(weekday);
                const currentDay = now.getDay();
                let daysToAdd = targetDay - currentDay;
                if (daysToAdd <= 0) daysToAdd += 7;
                return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToAdd);
            }
            if (dateString.includes(`this ${weekday}`)) {
                const targetDay = weekdays.indexOf(weekday);
                const currentDay = now.getDay();
                let daysToAdd = targetDay - currentDay;
                if (daysToAdd < 0) daysToAdd += 7;
                return new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysToAdd);
            }
        }

        // Handle month + day patterns (e.g., "5th september", "september 5th", "5 september")
        const monthNames = [
            'january', 'jan', 'february', 'feb', 'march', 'mar', 'april', 'apr',
            'may', 'june', 'jun', 'july', 'jul', 'august', 'aug', 'september', 'sept', 'sep',
            'october', 'oct', 'november', 'nov', 'december', 'dec'
        ];

        const monthMap: { [key: string]: number } = {
            'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
            'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5, 'july': 6, 'jul': 6,
            'august': 7, 'aug': 7, 'september': 8, 'sept': 8, 'sep': 8,
            'october': 9, 'oct': 9, 'november': 10, 'nov': 10, 'december': 11, 'dec': 11
        };

        // Extract day and month from patterns like "5th september", "september 5th", "5 september"
        const dayMatch = dateString.match(/(\d{1,2})(?:st|nd|rd|th)?/);
        const monthMatch = monthNames.find(month => dateString.includes(month));

        if (dayMatch && monthMatch) {
            const day = parseInt(dayMatch[1]);
            const month = monthMap[monthMatch];
            const year = now.getFullYear();

            // If the date has passed this year, assume next year
            const date = new Date(year, month, day);
            if (date < now) {
                date.setFullYear(year + 1);
            }

            return date;
        }

        // Handle numeric formats like "12/25", "25-12"
        const numericMatch = dateString.match(/(\d{1,2})[\/\-\.](\d{1,2})/);
        if (numericMatch) {
            const first = parseInt(numericMatch[1]);
            const second = parseInt(numericMatch[2]);

            // Assume MM/DD format for now (could be enhanced with locale detection)
            const month = first - 1; // 0-based
            const day = second;
            const year = now.getFullYear();

            const date = new Date(year, month, day);
            if (date < now) {
                date.setFullYear(year + 1);
            }

            return date;
        }

        return null;
    };

    // Function to render styled elements as React components
    const renderStyledElements = (text: string) => {
        if (!text) return null;

        const elements: React.ReactNode[] = [];
        let lastIndex = 0;

        // Regex for dates, projects, priorities
        const dateRegex = getAllDatePatterns();
        const projectRegex = /#(\w+)/g;
        const priorityRegex = /\b(urgent|high|medium|low|p1|p2|p3|p4)\b/gi;

        const matches: { index: number; length: number; type: 'date' | 'project' | 'priority'; value: string; }[] = [];

        // Find all matches
        let match;
        while ((match = dateRegex.exec(text)) !== null) {
            matches.push({ index: match.index, length: match[0].length, type: 'date', value: match[0] });
        }
        while ((match = projectRegex.exec(text)) !== null) {
            matches.push({ index: match.index, length: match[0].length, type: 'project', value: match[1] });
        }
        while ((match = priorityRegex.exec(text)) !== null) {
            matches.push({ index: match.index, length: match[0].length, type: 'priority', value: match[0] });
        }

        // Sort matches by index
        matches.sort((a, b) => a.index - b.index);

        matches.forEach((m) => {
            // Add preceding plain text
            if (m.index > lastIndex) {
                elements.push(text.substring(lastIndex, m.index));
            }

            // Add styled element
            if (m.type === 'date') {
                elements.push(
                    <Badge key={`${m.type}-${m.index}`} variant="secondary" className="bg-blue-500 text-white mr-1">
                        <Calendar className="h-3 w-3 mr-1" />
                        {m.value}
                    </Badge>
                );
            } else if (m.type === 'project') {
                elements.push(
                    <Badge key={`${m.type}-${m.index}`} variant="secondary" className="bg-red-500 text-white mr-1">
                        #{m.value}
                    </Badge>
                );
            } else if (m.type === 'priority') {
                const priorityClass = m.value.toLowerCase().includes('urgent') || m.value.toLowerCase().includes('p1') ? 'bg-red-500' :
                    m.value.toLowerCase().includes('high') || m.value.toLowerCase().includes('p2') ? 'bg-orange-500' :
                        m.value.toLowerCase().includes('medium') || m.value.toLowerCase().includes('p3') ? 'bg-blue-500' :
                            'bg-gray-500';
                elements.push(
                    <Badge key={`${m.type}-${m.index}`} variant="secondary" className={`${priorityClass} text-white mr-1`}>
                        <Flag className="h-3 w-3 mr-1" />
                        {m.value}
                    </Badge>
                );
            }
            lastIndex = m.index + m.length;
        });

        // Add any remaining plain text
        if (lastIndex < text.length) {
            elements.push(text.substring(lastIndex));
        }

        return elements;
    };

    // Handle key events for contenteditable
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void handleSubmit(e as any);
        }
        if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            inputRef.current?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        try {
            // Parse project from hashtag
            const detectedProjectId = parseProjectFromInput(input);
            const finalProjectId = detectedProjectId || projectId;

            // Parse recurring pattern
            const recurringPattern = parseRecurringPattern(input);
            const timeFromText = parseTimeFromText(input);

            console.log("Input text:", input);
            console.log("Parsed recurring pattern:", recurringPattern);
            console.log("Parsed time:", timeFromText);

            // Clean the input text (remove hashtags and recurring patterns)
            let cleanTitle = cleanInputText(input);
            if (recurringPattern) {
                cleanTitle = cleanRecurringText(cleanTitle);
            }

            console.log("Cleaned title:", cleanTitle);

            // Comprehensive date parsing using all patterns
            const parsedDate = parseComprehensiveDate(input);

            // Calculate initial due date for recurring tasks
            let initialDueDate = parsedDate;
            if (recurringPattern && !parsedDate) {
                // If no specific date but recurring pattern, calculate the next occurrence
                const today = new Date();

                if (recurringPattern.type === "weekly" && recurringPattern.dayOfWeek !== undefined) {
                    // Calculate next occurrence of the specified day of week
                    const currentDay = today.getDay();
                    const targetDay = recurringPattern.dayOfWeek;
                    let daysToAdd = targetDay - currentDay;

                    // If today is the target day, schedule for next week
                    if (daysToAdd === 0) {
                        daysToAdd = 7;
                    }
                    // If target day has passed this week, schedule for next week
                    else if (daysToAdd < 0) {
                        daysToAdd += 7;
                    }

                    initialDueDate = new Date(today);
                    initialDueDate.setDate(today.getDate() + daysToAdd);
                } else {
                    // For other recurring patterns, start from today
                    initialDueDate = new Date();
                }

                if (timeFromText) {
                    const hours = Math.floor(timeFromText / 60);
                    const minutes = timeFromText % 60;
                    initialDueDate.setHours(hours, minutes, 0, 0);
                }
            } else if (!parsedDate && !recurringPattern) {
                // If no date is specified and no recurring pattern, default to today only if on Today page
                const isOnTodayPage = location.pathname === '/' || location.pathname === '/today';
                if (isOnTodayPage) {
                    initialDueDate = new Date();
                }
            }

            // Create task with or without recurring pattern
            const taskData: any = {
                title: cleanTitle,
                priority: undefined, // No default priority
                labelIds: [],
                projectId: finalProjectId || undefined,
                due: initialDueDate ? initialDueDate.getTime() : undefined,
            };

            // Add recurring task fields if pattern detected
            if (recurringPattern) {
                taskData.isRecurring = true;
                taskData.recurringPattern = recurringPattern.type;
                taskData.recurringInterval = recurringPattern.interval;
                taskData.recurringDayOfWeek = recurringPattern.dayOfWeek;
                taskData.recurringDayOfMonth = recurringPattern.dayOfMonth;
                taskData.recurringTime = timeFromText || recurringPattern.time;
                taskData.originalDueDate = initialDueDate ? initialDueDate.getTime() : undefined;
            }

            console.log("Final task data:", taskData);

            const createdTaskId = await createTask(taskData);
            setInput("");

            toast.success("Task created!", {
                description: `"${taskData.title}" has been added to your list.`,
                action: {
                    label: "Go to Task",
                    onClick: () => navigateToTask({ ...taskData, _id: createdTaskId, projectId: finalProjectId }),
                },
            });

        } catch (error) {
            console.error("Failed to create task:", error);
        }
    };

    // Global "type to add" focus behavior
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Ignore if modifier keys pressed or it's not a visible character
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            // If focus is already inside an input/textarea/contenteditable or a dialog, don't steal focus
            const isTypingTarget = !!target && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                (target as any).isContentEditable ||
                target.closest('[role="dialog"]') !== null
            );
            if (isTypingTarget) return;

            // Only handle printable keys
            if (e.key.length === 1) {
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handler, { capture: true });
        return () => window.removeEventListener('keydown', handler, { capture: true } as any);
    }, []);

    const startVoiceRecording = async () => {
        try {
            console.log("Starting audio recording with MediaRecorder...");
            console.log("Browser:", navigator.userAgent);
            console.log("MediaRecorder supported:", typeof MediaRecorder !== 'undefined');
            console.log("getUserMedia supported:", !!navigator.mediaDevices?.getUserMedia);

            // Check microphone permissions first
            const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            console.log("Microphone permission:", permissionStatus.state);

            if (permissionStatus.state === 'denied') {
                alert("Microphone access denied. Please enable microphone permissions in your browser settings.");
                return;
            }

            // Start with basic audio constraints for better compatibility
            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
            } catch (e) {
                console.warn("Failed with enhanced audio constraints, trying basic audio:", e);
                // Fallback to basic audio if enhanced constraints fail
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: true
                });
            }

            audioStreamRef.current = stream;
            console.log("Audio stream obtained:", {
                active: stream.active,
                tracks: stream.getTracks().length,
                audioTracks: stream.getAudioTracks().map(t => ({
                    enabled: t.enabled,
                    readyState: t.readyState,
                    muted: t.muted,
                    settings: t.getSettings()
                }))
            });

            // Validate we have at least one active audio track
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length === 0) {
                alert("No audio tracks available. Please check your microphone.");
                return;
            }

            // Ensure audio track is ready
            const audioTrack = audioTracks[0];
            if (audioTrack.readyState !== 'live') {
                console.warn("Audio track not ready, state:", audioTrack.readyState);
            }

            if (audioContextRef.current && analyserRef.current) {
                const source = audioContextRef.current.createMediaStreamSource(stream);
                source.connect(analyserRef.current);
            }

            // Small delay to ensure stream is fully active before creating MediaRecorder
            await new Promise(resolve => setTimeout(resolve, 100));

            // Test different audio formats for better compatibility
            let mimeType = '';
            const testFormats = ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/ogg', ''];

            for (const format of testFormats) {
                if (format === '' || MediaRecorder.isTypeSupported(format)) {
                    mimeType = format;
                    console.log("Selected audio format:", mimeType || 'default');
                    break;
                }
            }

            try {
                // Create MediaRecorder with or without mime type
                mediaRecorderRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : {});
                console.log("MediaRecorder created with stream tracks:", stream.getTracks().length);
                console.log("Stream constraints satisfied:", stream.getTracks().map(t => t.getSettings()));
            } catch (e) {
                console.error("Failed to create MediaRecorder:", e);
                alert("Failed to initialize audio recording. Please try a different browser.");
                setIsRecording(false);
                return;
            }

            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                console.log("Audio data available:", event.data.size, "bytes", event.data.type);
                // Always push chunks, even if size is 0 - some browsers report 0 but have data
                audioChunksRef.current.push(event.data);
                console.log("Audio chunk added. Total chunks:", audioChunksRef.current.length);
            };

            mediaRecorderRef.current.onstart = () => {
                console.log("MediaRecorder started successfully");
            };

            mediaRecorderRef.current.onstop = () => {
                console.log("Recording stopped, processing audio... Total chunks:", audioChunksRef.current.length);

                // Don't process if we're canceling
                if (isCancelingRef.current) {
                    console.log("Canceling detected, skipping audio processing");
                    isCancelingRef.current = false;
                    return;
                }

                // Process immediately - data should already be available
                void processAudioBlob();
            };

            mediaRecorderRef.current.onerror = (event) => {
                console.error("MediaRecorder error:", event);
                alert("Recording failed. Please check microphone permissions and try again.");
                setIsRecording(false);
            };

            // Start recording without time slicing first (compatibility)
            try {
                console.log("Starting MediaRecorder without time slicing...");
                mediaRecorderRef.current.start(); // No time slicing - let it collect naturally
                console.log("MediaRecorder.start() called, state:", mediaRecorderRef.current.state);

                // Only request data after a reasonable delay to allow natural collection
                setTimeout(() => {
                    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                        console.log("Requesting data after 2 seconds for compatibility");
                        mediaRecorderRef.current.requestData();
                    }
                }, 2000);

            } catch (e) {
                console.error("Failed to start MediaRecorder:", e);
                alert("Failed to start recording. Your browser might not support this feature.");
                setIsRecording(false);
                return;
            }

            setIsRecording(true);
            setTranscript("");
            setInterimTranscript("");
            setRecordingTime(0);

            console.log("MediaRecorder started successfully");

            // Start timer immediately with debugging
            console.log("Starting recording timer...");

            // Clear any existing timer first
            if (timerRef.current) {
                console.log("Clearing existing timer before starting new one");
                clearInterval(timerRef.current);
            }

            const startTimer = () => {
                timerRef.current = setInterval(() => {
                    console.log("Timer callback triggered");
                    setRecordingTime(prev => {
                        const newTime = prev + 1;
                        console.log("Timer tick - recording time now:", newTime);
                        return newTime;
                    });
                }, 1000);
                console.log("Timer started with ID:", timerRef.current);
            };

            // Start timer immediately
            startTimer();

            // Backup: If timer doesn't work, try again after a short delay
            setTimeout(() => {
                if (!timerRef.current) {
                    console.log("Timer not running, attempting restart...");
                    startTimer();
                }
            }, 100);

            // Verify timer is working after 1.5 seconds
            setTimeout(() => {
                console.log("Timer check after 1.5s - timer exists:", !!timerRef.current);
                // Force a manual increment if timer isn't working
                if (timerRef.current) {
                    console.log("Timer is running normally");
                } else {
                    console.log("Timer failed, manually incrementing for testing");
                    setRecordingTime(1);
                }
            }, 1500);

            // Validate stream tracks
            const tracks = stream.getTracks();
            console.log("Stream tracks after MediaRecorder start:", tracks.map(t => ({
                kind: t.kind,
                enabled: t.enabled,
                readyState: t.readyState,
                muted: t.muted
            })));

            // Ensure audio track is enabled
            tracks.forEach(track => {
                if (track.kind === 'audio') {
                    track.enabled = true;
                    console.log("Audio track enabled:", track.enabled);
                }
            });

            // Start SpeechRecognition for live captions
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.start();
                } catch (e) {
                    console.error("Failed to start SpeechRecognition for captions:", e);
                }
            }

        } catch (error) {
            console.error("Failed to start voice recording:", error);
            setIsRecording(false);
        }
    };

    const stopVoiceRecording = () => {
        console.log("Stopping voice recording...");

        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log("Stopping MediaRecorder, current state:", mediaRecorderRef.current.state);
            console.log("Audio chunks before stop:", audioChunksRef.current.length);

            // Request data if none collected yet
            if (audioChunksRef.current.length === 0) {
                console.log("No chunks collected yet, requesting data...");
                mediaRecorderRef.current.requestData();
            }

            mediaRecorderRef.current.stop();
        }

        if (recognitionRef.current) {
            console.log("Stopping speech recognition");
            recognitionRef.current.stop();
        }
        if (timerRef.current) {
            console.log("Clearing recording timer, final time:", recordingTime);
            console.log("Timer ID being cleared:", timerRef.current);
            clearInterval(timerRef.current);
            timerRef.current = null;
        } else {
            console.log("No timer to clear - timerRef.current is null");
        }
        setIsRecording(false);

        // Clean up audio stream after a short delay to allow final data collection
        setTimeout(() => {
            if (audioStreamRef.current) {
                console.log("Stopping audio stream tracks");
                audioStreamRef.current.getTracks().forEach(track => track.stop());
            }
        }, 200);
    };

    const cancelVoiceRecording = () => {
        console.log("Canceling voice recording...");
        isCancelingRef.current = true;

        // Stop recording without processing
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            console.log("Stopping MediaRecorder for cancellation");
            mediaRecorderRef.current.stop();
        }

        if (recognitionRef.current) {
            console.log("Stopping speech recognition for cancellation");
            recognitionRef.current.stop();
        }

        if (timerRef.current) {
            console.log("Clearing recording timer for cancellation");
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Clear all recorded data
        audioChunksRef.current = [];
        setTranscript("");
        setInterimTranscript("");
        setRecordingTime(0);
        setIsRecording(false);

        // Clean up audio stream immediately
        if (audioStreamRef.current) {
            console.log("Stopping audio stream tracks for cancellation");
            audioStreamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    const processAudioBlob = async () => {
        console.log("Processing audio blob. Chunks available:", audioChunksRef.current.length);
        console.log("Recording time:", recordingTime, "seconds");

        if (audioChunksRef.current.length === 0) {
            console.error("No audio chunks collected. MediaRecorder state:", mediaRecorderRef.current?.state);
            console.error("Stream active:", audioStreamRef.current?.active);
            console.error("Stream tracks:", audioStreamRef.current?.getTracks().map(t => ({
                kind: t.kind,
                enabled: t.enabled,
                readyState: t.readyState
            })));
            alert("No audio data recorded. Please ensure microphone permissions are granted and try speaking longer.");
            return;
        }

        // Use the first chunk's type if available, otherwise fallback
        const firstChunkType = audioChunksRef.current[0]?.type || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: firstChunkType });

        console.log("Audio blob created. Size:", audioBlob.size, "bytes", "Type:", firstChunkType);
        console.log("Chunk details:", audioChunksRef.current.map((chunk, i) => `Chunk ${i}: ${chunk.size} bytes`));

        if (audioBlob.size === 0) {
            console.error("Audio blob is 0 bytes. Debugging info:");
            console.error("- Recording time:", recordingTime);
            console.error("- Chunks collected:", audioChunksRef.current.length);
            console.error("- MediaRecorder final state:", mediaRecorderRef.current?.state);
            console.error("- Stream active:", audioStreamRef.current?.active);

            alert(`No audio data captured. Please check:
• Microphone permissions are granted
• You spoke loudly enough
• Recording lasted ${recordingTime} seconds
• Try refreshing the page and trying again`);
            return;
        }

        // Only check duration if we have some audio data
        console.log("Audio blob is valid, proceeding with transcription...");

        setIsProcessingAI(true);
        try {
            // Convert Blob to Base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const result = reader.result;
                const base64data = typeof result === 'string' ? result.split(',')[1] : null;
                if (base64data) {
                    try {
                        console.log("Transcribing audio with Whisper...");
                        const transcription = await transcribeAudio({ audioBase64: base64data });
                        console.log("Transcription result:", transcription.text);

                        if (transcription.text.trim()) {
                            await processWithAI(transcription.text.trim());
                        } else {
                            alert("Could not transcribe audio. Please try speaking more clearly.");
                        }
                    } catch (error) {
                        console.error("Transcription or AI processing failed:", error);
                        alert(`Failed to process voice input: ${error instanceof Error ? error.message : String(error)}`);
                    } finally {
                        setIsProcessingAI(false);
                    }
                }
            };
        } catch (error) {
            console.error("Failed to process audio:", error);
            setIsProcessingAI(false);
        }
    };

    const handleAICapture = async () => {
        if (isRecording) {
            // Enforce minimum recording time - must record for at least 2 seconds
            if (recordingTime < 2) {
                console.log("Recording too short, need at least 2 seconds. Current:", recordingTime);
                alert("Please speak for at least 2 seconds before stopping.");
                return;
            }

            console.log("User clicked to stop recording after", recordingTime, "seconds");
            stopVoiceRecording();
            return;
        }

        // If there's text in the input field, process it with AI (text mode)
        if (input.trim()) {
            if (!projects || !labels) return;
            await processWithAI(input.trim());
            return;
        }

        // Start voice recording
        await startVoiceRecording();
    };

    const processWithAI = async (text: string) => {
        if (!projects || !labels) return;

        console.log("Processing with AI:", text);
        setIsProcessingAI(true);
        try {
            const projectCatalog = projects.map(p => p.name);
            const labelCatalog = labels.map(l => l.name);

            const result = await aiCapture({
                utterance: text,
                projectCatalog,
                labelCatalog,
            });

            for (const taskData of result.tasks) {
                let taskProjectId: Id<"projects"> | undefined;
                // Use current project ID if we're on a project page
                if (projectId) {
                    taskProjectId = projectId;
                } else if (taskData.project_hint) {
                    const project = projects.find(p =>
                        p.name.toLowerCase() === taskData.project_hint!.toLowerCase()
                    );
                    taskProjectId = project?._id;
                }

                const labelIds: Id<"labels">[] = [];
                for (const labelName of taskData.labels) {
                    const label = labels.find(l =>
                        l.name.toLowerCase() === labelName.toLowerCase()
                    );
                    if (label) {
                        labelIds.push(label._id);
                    }
                }

                const createdTaskId = await createTask({
                    title: taskData.title,
                    notes: taskData.notes,
                    projectId: taskProjectId,
                    priority: taskData.priority,
                    due: taskData.due ? new Date(taskData.due).getTime() : undefined,
                    labelIds,
                });

                toast.success("Task created!", {
                    description: `"${taskData.title}" has been added to your list.`,
                    action: {
                        label: "Go to Task",
                        onClick: () => navigateToTask({ ...taskData, _id: createdTaskId, projectId: taskProjectId }),
                    },
                });
            }

            setInput("");
            setTranscript("");
            setInterimTranscript("");
        } catch (error) {
            console.error("Failed to process AI capture:", error);
            alert(`Failed to process AI request: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsProcessingAI(false);
        }
    };

    const hasMediaRecorder = typeof window !== "undefined" &&
        'MediaRecorder' in window &&
        'navigator' in window &&
        'mediaDevices' in navigator;

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const currentTranscript = (transcript + " " + interimTranscript).trim();

    // Get date highlighting for current input
    const inputHighlighting = highlightDates(input);
    const transcriptHighlighting = isRecording ? highlightDates(currentTranscript) : { hasDate: false, highlighted: [] };

    return (
        <div className="space-y-4">
            {/* Main Input Form */}
            <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center space-x-4">
                <div className="flex-1 relative">
                    <Input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => onFocusChange(true)}
                        onBlur={() => onFocusChange(false)}
                        placeholder="Add a task... Try: 'Buy groceries tomorrow #work urgent' (Cmd/Ctrl+K to focus)"
                        disabled={isRecording}
                        className="h-10 pr-20 text-white/10 caret-foreground text-base md:text-base"
                    />
                    {/* Overlay for styled elements */}
                    {input && (
                        <div className="absolute inset-0 pointer-events-none flex items-center px-3 py-2.5 overflow-hidden">
                            <div className="flex flex-wrap items-center gap-1 w-full">
                                {renderStyledElements(input)}
                            </div>
                        </div>
                    )}
                </div>

                <Button
                    type="submit"
                    disabled={!input.trim() || isRecording || isProcessingAI}
                    size="lg"
                >
                    <Plus className="h-4 w-4" />
                    Add
                </Button>

                <Popover open={isRecording} onOpenChange={() => { }}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            onClick={() => {
                                if (!subscription?.canUseAI) {
                                    toast.error("AI Voice Input requires Pro subscription", {
                                        description: "Upgrade to Pro to use voice commands for creating tasks.",
                                        action: {
                                            label: "Upgrade",
                                            onClick: () => window.location.href = "/settings",
                                        },
                                    });
                                    return;
                                }
                                void handleAICapture();
                            }}
                            disabled={isProcessingAI}
                            variant={isRecording ? "destructive" : "secondary"}
                            size="lg"
                        >
                            {isProcessingAI ? (
                                "Processing..."
                            ) : isRecording ? (
                                <>
                                    <div className="relative">
                                        <div className="relative bg-red-500 w-4 h-4 rounded-full animate-pulse"></div>
                                    </div>
                                    {`Done ${recordingTime}s`}
                                </>
                            ) : input.trim() ? (
                                <>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    AI Parse
                                </>
                            ) : hasMediaRecorder ? (
                                <>
                                    <Mic className="h-4 w-4 mr-1" />
                                    AI Voice
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    AI
                                </>
                            )}
                        </Button>
                    </PopoverTrigger>
                    {isRecording && (
                        <PopoverContent className="w-96 p-4 mt-2 bg-black rounded-lg" align="end">
                            <div className="space-y-4">

                                {/* Live Captions */}
                                {currentTranscript ? (
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap gap-1">
                                            {transcriptHighlighting.highlighted}
                                        </div>
                                        {transcriptHighlighting.hasDate && (
                                            <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mt-2 flex items-center">
                                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                                Dates detected in speech
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center space-y-2">
                                        <div className="text-muted-foreground text-sm pb-4 space-y-2">
                                            <div className="flex items-center justify-center">
                                                <video src="/globe.mp4" autoPlay loop muted className="w-[125px] object-cover" />
                                            </div>
                                            <div>Start speaking: <br /> "Buy groceries tomorrow urgent, call mom..."</div>
                                            <div className="text-xs">Record for atleast 2 seconds</div>
                                        </div>
                                    </div>
                                )}

                                {/* Control Buttons */}
                                <div className="flex justify-center space-x-3 pb-2">
                                    <Button variant="outline" onClick={cancelVoiceRecording} size="sm">
                                        Cancel
                                    </Button>
                                    <Button onClick={stopVoiceRecording} size="sm">
                                        Done - Process Tasks
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    )}
                </Popover>
            </form>
        </div >
    );
}
