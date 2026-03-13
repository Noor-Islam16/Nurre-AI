// Onboarding Question Data Structure (30-Question Version)
// Original 20 DSM-5 questions (Sections A–D) + 10 Nuree personalisation questions (Section E)
// Section E drives avatar personality, focus tools, distraction routing, and environment adaptation

// ============================================
// INTERFACES
// ============================================

export interface Question {
  id: number;
  section: "A" | "B" | "C" | "D" | "E";
  type:
    | "gender"
    | "age"
    | "multiselect"
    | "likert"
    | "frequency"
    | "binary"
    | "onset"
    | "single"
    | "text"
    | "single_with_other";
  text: string;
  avatarScript?: string; // What the avatar says aloud
  options?: string[];
  values?: (number | string)[];
  domain?: "inattention" | "hyperactivity" | "impairment";
  personalisationKey?: string; // Section E routing signals for avatar engine
  signalKey?: string; // Section A–D routing signals for scoring engine
  originalId?: number;
}

export interface Section {
  id: "A" | "B" | "C" | "D" | "E";
  title: string;
  description: string;
  questions: Question[];
}

// ============================================
// SECTION A: PROFILE & CONTEXT (3 questions)
// ============================================

const sectionA: Question[] = [
  {
    id: 1,
    section: "A",
    type: "gender",
    text: "Gender",
    options: ["Female", "Male"],
    values: ["female", "male"],
    originalId: 1,
  },
  {
    id: 2,
    section: "A",
    type: "age",
    text: "Age",
    options: ["18–35", "36–45", "46–55", "56–64", "65+"],
    values: ["18-35", "36-45", "46-55", "56-64", "65+"],
    originalId: 2,
  },
  {
    id: 3,
    section: "A",
    type: "onset",
    text: "When did you start noticing struggles with concentration or activity levels?",
    options: [
      "In childhood (before 12)",
      "During adolescence (13–17)",
      "In adulthood (18+)",
      "Not sure",
    ],
    values: ["childhood", "adolescence", "adulthood", "not_sure"],
    originalId: 4,
  },
];

// ============================================
// SECTION B: CORE SYMPTOM ITEMS (12 questions)
// 6 Inattention + 6 Hyperactivity/Impulsivity
// ============================================

const sectionB: Question[] = [
  // Inattention items (6 most discriminative)
  {
    id: 4,
    section: "B",
    type: "likert",
    text: "I find it difficult to remember appointments or obligations.",
    domain: "inattention",
    originalId: 6,
  },
  {
    id: 5,
    section: "B",
    type: "likert",
    text: "I misplace or have trouble finding things at home or at work.",
    domain: "inattention",
    signalKey: "loses_things",
    originalId: 8,
  },
  {
    id: 6,
    section: "B",
    type: "likert",
    text: "I can't focus, even when people talk to me.",
    domain: "inattention",
    originalId: 9,
  },
  {
    id: 7,
    section: "B",
    type: "likert",
    text: "I make careless mistakes when I have to work on a boring or difficult project.",
    domain: "inattention",
    signalKey: "careless_mistakes",
    originalId: 18,
  },
  {
    id: 8,
    section: "B",
    type: "likert",
    text: "I struggle to stay organized when a task requires it.",
    domain: "inattention",
    originalId: 23,
  },
  {
    id: 9,
    section: "B",
    type: "likert",
    text: "I put off thinking-intensive tasks.",
    domain: "inattention",
    signalKey: "avoids_effort",
    originalId: 24,
  },
  // Hyperactivity/Impulsivity items (6 most discriminative)
  {
    id: 10,
    section: "B",
    type: "likert",
    text: "I struggle to sit still in one place for a long time.",
    domain: "hyperactivity",
    originalId: 7,
  },
  {
    id: 11,
    section: "B",
    type: "likert",
    text: "I often feel restless or fidgety.",
    domain: "hyperactivity",
    signalKey: "restless",
    originalId: 10,
  },
  {
    id: 12,
    section: "B",
    type: "likert",
    text: "I find it hard to wait for my turn (e.g., standing in line).",
    domain: "hyperactivity",
    signalKey: "waits_turn",
    originalId: 12,
  },
  {
    id: 13,
    section: "B",
    type: "likert",
    text: "I often interrupt others when they are busy.",
    domain: "hyperactivity",
    signalKey: "interrupts",
    originalId: 13,
  },
  {
    id: 14,
    section: "B",
    type: "likert",
    text: "I struggle to stay seated during meetings.",
    domain: "hyperactivity",
    signalKey: "leave_seat",
    originalId: 20,
  },
  {
    id: 15,
    section: "B",
    type: "likert",
    text: 'I often feel "forced," like I\'m driven by a motor.',
    domain: "hyperactivity",
    signalKey: "driven_by_motor",
    originalId: 21,
  },
];

// ============================================
// SECTION C: DISTRACTION BEHAVIOR (1 question)
// ============================================

const sectionC: Question[] = [
  {
    id: 16,
    section: "C",
    type: "single",
    text: "What distracts you the most?",
    options: [
      "Social media",
      "Phone notifications",
      "Watching TV/videos",
      "Talking with colleagues",
      "None of the above",
    ],
    originalId: 16,
  },
];

// ============================================
// SECTION D: IMPAIRMENT & SEVERITY (4 questions)
// ============================================

const sectionD: Question[] = [
  {
    id: 17,
    section: "D",
    type: "frequency",
    text: "Do you feel overwhelmed while doing complex tasks?",
    options: [
      "Yes, always",
      "Yes, often",
      "From time to time",
      "Rarely",
      "Never",
    ],
    values: [5, 4, 3, 2, 1],
    domain: "impairment",
    originalId: 17,
  },
  {
    id: 18,
    section: "D",
    type: "likert",
    text: "Do you struggle with handling stress and tend to overreact in stressful situations?",
    domain: "impairment",
    signalKey: "overreact_stress",
    originalId: 22,
  },
  {
    id: 19,
    section: "D",
    type: "frequency",
    text: "How often do you find yourself day-dreaming while reading?",
    options: ["All the time", "Often", "Sometimes", "Rarely", "Never"],
    values: [5, 4, 3, 2, 1],
    signalKey: "daydream_reading",
    originalId: 25,
  },
  {
    id: 20,
    section: "D",
    type: "likert",
    text: "I struggle to finish a project once the hard parts are done.",
    domain: "impairment",
    originalId: 26,
  },
];

// ============================================
// SECTION E: NUREE PERSONALISATION (10 questions)
// Drives avatar personality, focus tools, environment adaptation,
// distraction routing, and dopamine motivation style.
// Shown after Sections A–D.
// ============================================

const sectionE: Question[] = [
  {
    id: 21,
    section: "E",
    type: "multiselect",
    text: "What kinds of tasks do you usually work on during your day?",
    avatarScript: "What kinds of tasks do you usually work on during your day?",
    options: [
      "Studying",
      "Writing",
      "Coding",
      "Research",
      "Creative work",
      "Admin",
    ],
    values: [
      "studying",
      "writing",
      "coding",
      "research",
      "creative_work",
      "admin",
    ],
    personalisationKey: "task_type",
  },
  {
    id: 22,
    section: "E",
    type: "single",
    text: "When do you usually feel most focused?",
    avatarScript: "When do you usually feel most focused?",
    options: ["Morning", "Afternoon", "Evening", "Late night"],
    values: ["morning", "afternoon", "evening", "late_night"],
    personalisationKey: "peak_focus_time",
  },
  {
    id: 23,
    section: "E",
    type: "single",
    text: "When you lose focus, what usually happens first?",
    avatarScript: "When you lose focus, what usually happens first?",
    options: [
      "I pick up my phone",
      "I switch to another task",
      "I start daydreaming",
      "I leave my workspace",
    ],
    values: [
      "picks_up_phone",
      "task_switches",
      "daydreams",
      "leaves_workspace",
    ],
    personalisationKey: "first_distraction_trigger",
  },
  {
    id: 24,
    section: "E",
    type: "single_with_other",
    text: "If you pick up your phone, which app do you open first?",
    avatarScript: "If you pick up your phone, which app do you open first?",
    options: [
      "Instagram",
      "TikTok",
      "YouTube",
      "Messages",
      "LinkedIn",
      "Other",
    ],
    values: ["instagram", "tiktok", "youtube", "messages", "linkedin", "other"],
    personalisationKey: "phone_app_trigger",
    // "Other" allows voice or typed free input
  },
  {
    id: 25,
    section: "E",
    type: "single",
    text: "Which one sounds most like you?",
    avatarScript: "Which one sounds most like you?",
    options: [
      "I struggle to start tasks",
      "I struggle to finish tasks",
      "I hyperfocus on some things and ignore others",
      "I procrastinate until deadlines",
    ],
    values: ["cant_start", "cant_finish", "hyperfocus", "deadline_driven"],
    personalisationKey: "adhd_pattern",
  },
  {
    id: 26,
    section: "E",
    type: "single",
    text: "What motivates you most to complete a task?",
    avatarScript: "What motivates you most to complete a task?",
    options: [
      "Clear step-by-step progress",
      "Rewards or points",
      "Deadlines",
      "Encouragement",
    ],
    values: ["progress_steps", "rewards", "deadlines", "encouragement"],
    personalisationKey: "motivation_style",
  },
  {
    id: 27,
    section: "E",
    type: "single_with_other",
    text: "When you're feeling overwhelmed, what usually helps?",
    avatarScript: "When you're feeling overwhelmed, what usually helps?",
    options: [
      "Taking a short break",
      "Talking things through",
      "Listening to music",
      "Breathing exercises",
      "Writing things down",
      "Other",
    ],
    values: [
      "short_break",
      "talking",
      "music",
      "breathing",
      "writing",
      "other",
    ],
    personalisationKey: "regulation_strategy",
  },
  {
    id: 28,
    section: "E",
    type: "single",
    text: "How should I support you when you're distracted?",
    avatarScript: "How should I support you when you're distracted?",
    options: [
      "Gentle encouragement",
      "Humor and playfulness",
      "Direct reminders",
      "Motivational push",
    ],
    values: ["gentle", "humorous", "direct", "motivational"],
    personalisationKey: "avatar_tone",
  },
  {
    id: 29,
    section: "E",
    type: "single",
    text: "Where do you usually work?",
    avatarScript: "Where do you usually work?",
    options: ["Home", "School / university", "Office", "Public places"],
    values: ["home", "school", "office", "public"],
    personalisationKey: "work_environment",
  },
  {
    id: 30,
    section: "E",
    type: "single",
    text: "Which environment helps you focus best?",
    avatarScript:
      "Everyone's brain focuses differently depending on their environment. Which environment helps you focus best?",
    options: [
      "Quiet spaces with minimal noise",
      "Background sounds like cafés or soft noise",
      "Music or rhythmic sounds help me concentrate",
      "I focus best when there's a bit of movement or activity around me",
    ],
    values: ["silent", "ambient_noise", "music_rhythmic", "movement_activity"],
    personalisationKey: "sensory_focus_preference",
  },
];

// ============================================
// COMPLETE QUESTION LIST (30 questions)
// ============================================

export const ONBOARDING_QUESTIONS: Question[] = [
  ...sectionA, // Questions 1–3   — Profile & Context
  ...sectionB, // Questions 4–15  — Core Symptoms (DSM-5)
  ...sectionC, // Question  16    — Distraction Behaviour
  ...sectionD, // Questions 17–20 — Impairment & Severity
  ...sectionE, // Questions 21–30 — Nuree Personalisation
];

// ============================================
// SECTIONS STRUCTURE
// ============================================

export const SECTIONS: Section[] = [
  {
    id: "A",
    title: "Profile & Context",
    description: "Basic information about you",
    questions: sectionA,
  },
  {
    id: "B",
    title: "Core Symptoms",
    description: "How you experience daily activities",
    questions: sectionB,
  },
  {
    id: "C",
    title: "Distraction Patterns",
    description: "What affects your focus",
    questions: sectionC,
  },
  {
    id: "D",
    title: "Impact & Coping",
    description: "How symptoms affect your life",
    questions: sectionD,
  },
  {
    id: "E",
    title: "Your Nuree Profile",
    description: "How your avatar will support you",
    questions: sectionE,
  },
];

// ============================================
// HELPER CONSTANTS
// ============================================

export const LIKERT_LABELS = [
  "Strongly disagree",
  "Disagree",
  "Neither agree nor disagree",
  "Agree",
  "Strongly agree",
];

export const LIKERT_VALUES = [1, 2, 3, 4, 5];

// ============================================
// SECTION E — PERSONALISATION KEY REGISTRY
// Maps personalisationKey → what the avatar engine uses it for
// ============================================

export const PERSONALISATION_KEY_DESCRIPTIONS: Record<string, string> = {
  task_type: "Context for task-specific reminders and suggestions",
  peak_focus_time: "Schedule focus sessions and reminders at optimal times",
  first_distraction_trigger: "Route the correct intervention when focus breaks",
  phone_app_trigger: "Surface specific app-blocking or redirection nudges",
  adhd_pattern: "Detect inattentive / hyperactive / combined indicator",
  motivation_style: "Select dopamine-matching reward and progress mechanics",
  regulation_strategy:
    "Suggest the user's preferred coping tool when overwhelmed",
  avatar_tone:
    "Set avatar personality voice (gentle / humorous / direct / motivational)",
  work_environment: "Adapt ambient sound recommendations and break suggestions",
  sensory_focus_preference:
    "Select default soundscape and Focus Mode audio type",
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a question by its ID
 */
export function getQuestionById(id: number): Question | undefined {
  return ONBOARDING_QUESTIONS.find((q) => q.id === id);
}

/**
 * Get all questions for a specific section
 */
export function getQuestionsBySection(
  sectionId: "A" | "B" | "C" | "D" | "E",
): Question[] {
  return ONBOARDING_QUESTIONS.filter((q) => q.section === sectionId);
}

/**
 * Get all questions for a specific domain
 */
export function getQuestionsByDomain(
  domain: "inattention" | "hyperactivity" | "impairment",
): Question[] {
  return ONBOARDING_QUESTIONS.filter((q) => q.domain === domain);
}

/**
 * Get question IDs for inattention domain (for scoring)
 */
export function getInattentionQuestionIds(): number[] {
  return [4, 5, 6, 7, 8, 9];
}

/**
 * Get question IDs for hyperactivity domain (for scoring)
 */
export function getHyperactivityQuestionIds(): number[] {
  return [10, 11, 12, 13, 14, 15];
}

/**
 * Get question IDs for impairment assessment
 */
export function getImpairmentQuestionIds(): number[] {
  return [17, 18, 20];
}

/**
 * Get all Section E personalisation question IDs
 */
export function getPersonalisationQuestionIds(): number[] {
  return sectionE.map((q) => q.id); // [21–30]
}

/**
 * Get personalisation responses as a typed object for the avatar engine
 */
export function extractPersonalisationProfile(
  responses: Map<number, any>,
): Record<string, any> {
  const profile: Record<string, any> = {};
  sectionE.forEach((q) => {
    if (q.personalisationKey && responses.has(q.id)) {
      profile[q.personalisationKey] = responses.get(q.id);
    }
  });
  return profile;
}

/**
 * Check if a question is a Likert scale question
 */
export function isLikertQuestion(questionId: number): boolean {
  const question = getQuestionById(questionId);
  return question?.type === "likert";
}

/**
 * Get the numeric value for a response based on question type
 */
export function getResponseValue(
  questionId: number,
  response: string | number,
): number | string {
  const question = getQuestionById(questionId);
  if (!question) return response;

  if (question.values && question.options) {
    const index = question.options.indexOf(response as string);
    if (index !== -1) {
      return question.values[index];
    }
  }

  if (question.type === "likert" && typeof response === "string") {
    const index = LIKERT_LABELS.indexOf(response);
    if (index !== -1) {
      return LIKERT_VALUES[index];
    }
  }

  return response;
}

/**
 * Validate that all required questions have been answered
 */
export function validateAllQuestionsAnswered(
  responses: Map<number, any>,
): boolean {
  const requiredQuestionIds = ONBOARDING_QUESTIONS.map((q) => q.id);
  return requiredQuestionIds.every((id) => responses.has(id));
}

/**
 * Get progress percentage based on answered questions
 */
export function getProgressPercentage(responses: Map<number, any>): number {
  const totalQuestions = ONBOARDING_QUESTIONS.length;
  const answeredQuestions = ONBOARDING_QUESTIONS.filter((q) =>
    responses.has(q.id),
  ).length;
  return Math.round((answeredQuestions / totalQuestions) * 100);
}

/**
 * Get the next unanswered question
 */
export function getNextUnansweredQuestion(
  responses: Map<number, any>,
): Question | undefined {
  return ONBOARDING_QUESTIONS.find((q) => !responses.has(q.id));
}

/**
 * Format question for display (adds question number)
 */
export function formatQuestionText(question: Question): string {
  return `${question.id}. ${question.text}`;
}

/**
 * Map responses from 28-question format to 20-question format
 * Useful for legacy migration (Section E questions have no originalId mapping)
 */
export function mapFrom28To20Format(
  responses28: Map<number, any>,
): Map<number, any> {
  const responses20 = new Map<number, any>();

  ONBOARDING_QUESTIONS.forEach((q) => {
    if (q.originalId && responses28.has(q.originalId)) {
      responses20.set(q.id, responses28.get(q.originalId));
    }
  });

  return responses20;
}
