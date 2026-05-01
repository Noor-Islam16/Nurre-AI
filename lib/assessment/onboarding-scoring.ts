// Onboarding Scoring Engine (30-Question Version)
// Sections A–D (Q1–20): DSM-5 scoring — unchanged
// Section E (Q21–30): Nuree personalisation — validated separately, not scored
// onboarding-scoring.ts
// ============================================
// INTERFACES
// ============================================

export interface OnboardingResponse {
  questionNumber: number;
  response: string | number | string[];
}

export interface ScoringResult {
  counts: {
    inattEndorsed: number;
    hyperEndorsed: number;
    totalEndorsed: number;
  };
  severity: {
    inatt: number;
    hyper: number;
  };
  gates: {
    onsetChildhood: boolean;
    impairment: boolean;
  };
  screen:
    | "combined"
    | "inattentive"
    | "hyperactive"
    | "borderline"
    | "negative";
  routing: {
    topSignals: string[];
    recommendedAvatar: 'nur' | 'farin' | 'zak';
  };
}

// ============================================
// DOMAIN MAPPINGS (Sections A–D, Q1–20)
// ============================================

const INATT_ITEMS = [4, 5, 6, 7, 8, 9];
const HYPER_ITEMS = [10, 11, 12, 13, 14, 15];
const IMPAIRMENT_ITEMS = [17, 18, 20];

const SIGNAL_MAP: Record<number, string> = {
  5: "loses_things",
  9: "avoids_effort",
  7: "careless_mistakes",
  11: "restless",
  14: "leave_seat",
  15: "driven_by_motor",
  13: "interrupts",
  12: "waits_turn",
  19: "daydream_reading",
  18: "overreact_stress",
};

// Q1–20 must be answered for DSM-5 scoring
const SCORING_QUESTIONS = new Set([...Array(20).keys()].map((i) => i + 1));

// Q21–30 must be answered for personalisation
const PERSONALISATION_QUESTIONS = new Set(
  [...Array(10).keys()].map((i) => i + 21),
);

// ============================================
// MAIN SCORING FUNCTION
// ============================================

export function scoreAssessment(
  responses: OnboardingResponse[],
): ScoringResult {
  const responseMap = new Map<number, any>();
  responses.forEach((r) => {
    responseMap.set(r.questionNumber, r.response);
  });

  const onsetChildhood = checkOnsetGate(responseMap.get(3));
  const inattEndorsed = countEndorsed(INATT_ITEMS, responseMap);
  const hyperEndorsed = countEndorsed(HYPER_ITEMS, responseMap);
  const inattSeverity = calculateSeverity(INATT_ITEMS, responseMap);
  const hyperSeverity = calculateSeverity(HYPER_ITEMS, responseMap);
  const impairment = checkImpairmentGate(IMPAIRMENT_ITEMS, responseMap);

  const screen = determinePresentation(
    inattEndorsed,
    hyperEndorsed,
    onsetChildhood,
    impairment,
  );

  const topSignals = identifyTopSignals(responseMap);

  // Avatar Allocation Logic (Q21-30)
  const avatarScores = calculateAvatarScores(responseMap);

  return {
    counts: {
      inattEndorsed,
      hyperEndorsed,
      totalEndorsed: inattEndorsed + hyperEndorsed,
    },
    severity: {
      inatt: inattSeverity,
      hyper: hyperSeverity,
    },
    gates: {
      onsetChildhood,
      impairment,
    },
    screen,
    routing: {
      topSignals,
      recommendedAvatar: avatarScores.primary,
    },
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isEndorsed(value: number): boolean {
  return value >= 4;
}

function countEndorsed(items: number[], responseMap: Map<number, any>): number {
  return items.filter((item) => {
    const value = responseMap.get(item);
    return typeof value === "number" && isEndorsed(value);
  }).length;
}

function calculateSeverity(
  items: number[],
  responseMap: Map<number, any>,
): number {
  const values = items.map((item) => {
    const value = responseMap.get(item);
    return typeof value === "number" ? (value - 1) / 4 : 0;
  });
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(mean * 100);
}

function checkOnsetGate(response: string | undefined): boolean {
  return response === "childhood" || response === "adolescence";
}

function checkImpairmentGate(
  items: number[],
  responseMap: Map<number, any>,
): boolean {
  return countEndorsed(items, responseMap) >= 2;
}

function determinePresentation(
  inatt: number,
  hyper: number,
  onset: boolean,
  impairment: boolean,
): ScoringResult["screen"] {
  const positiveInatt = inatt >= 4;
  const positiveHyper = hyper >= 4;
  const passesGates = onset && impairment;

  if (positiveInatt && positiveHyper && passesGates) return "combined";
  if (positiveInatt && passesGates) return "inattentive";
  if (positiveHyper && passesGates) return "hyperactive";
  if (inatt === 3 || hyper === 3) return "borderline";
  return "negative";
}

function identifyTopSignals(responseMap: Map<number, any>): string[] {
  const signals: Array<{ signal: string; score: number }> = [];

  for (const [question, signal] of Object.entries(SIGNAL_MAP)) {
    const value = responseMap.get(Number(question));
    if (typeof value === "number" && value >= 4) {
      signals.push({ signal, score: value });
    }
  }

  return signals
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.signal);
}

function calculateAvatarScores(responseMap: Map<number, any>): { scores: Record<'nur' | 'farin' | 'zak', number>, primary: 'nur' | 'farin' | 'zak' } {
  const scores = { nur: 0, farin: 0, zak: 0 };

  // Q21: Tasks
  const q21 = responseMap.get(21);
  if (Array.isArray(q21)) {
    if (q21.includes("coding") || q21.includes("admin") || q21.includes("research")) scores.zak += 1;
    if (q21.includes("creative_work") || q21.includes("studying")) scores.nur += 1;
  }

  // Q23: First distraction
  const q23 = responseMap.get(23);
  if (q23 === "picks_up_phone" || q23 === "task_switches") scores.nur += 1;
  if (q23 === "daydreams") scores.farin += 1;

  // Q25: ADHD Pattern
  const q25 = responseMap.get(25);
  if (q25 === "hyperfocus") scores.nur += 1;
  if (q25 === "cant_start") scores.farin += 1;
  if (q25 === "cant_finish" || q25 === "deadline_driven") scores.zak += 1;

  // Q26: Motivation
  const q26 = responseMap.get(26);
  if (q26 === "rewards") scores.nur += 1;
  if (q26 === "encouragement") { scores.nur += 1; scores.farin += 1; }
  if (q26 === "progress_steps" || q26 === "deadlines") scores.zak += 2;

  // Q27: Overwhelm Support
  const q27 = responseMap.get(27);
  if (q27 === "talking" || q27 === "breathing") scores.farin += 2;
  if (q27 === "writing" || q27 === "short_break") scores.zak += 1;
  if (q27 === "music") scores.nur += 1;

  // Q28: Avatar Tone (Strongest indicator)
  const q28 = responseMap.get(28);
  if (q28 === "humorous" || q28 === "motivational") scores.nur += 2;
  if (q28 === "gentle") scores.farin += 2;
  if (q28 === "direct") scores.zak += 2;

  // Q30: Sensory Focus Preference
  const q30 = responseMap.get(30);
  if (q30 === "music_rhythmic" || q30 === "movement_activity") scores.nur += 1;
  if (q30 === "ambient_noise") scores.farin += 1;
  if (q30 === "silent") scores.zak += 1;

  // Determine primary avatar
  let primary: 'nur' | 'farin' | 'zak' = 'nur';
  let maxScore = scores.nur;
  if (scores.farin > maxScore) { primary = 'farin'; maxScore = scores.farin; }
  if (scores.zak > maxScore) { primary = 'zak'; maxScore = scores.zak; }

  return { scores, primary };
}

// ============================================
// VALIDATION FUNCTION
// ============================================

export function validateResponses(responses: OnboardingResponse[]): boolean {
  const answeredQuestions = new Set(responses.map((r) => r.questionNumber));

  // All 20 scoring questions (Q1–20) must be present
  const scoringComplete = [...SCORING_QUESTIONS].every((q) =>
    answeredQuestions.has(q),
  );

  // All 10 personalisation questions (Q21–30) must be present
  const personalisationComplete = [...PERSONALISATION_QUESTIONS].every((q) =>
    answeredQuestions.has(q),
  );

  return scoringComplete && personalisationComplete;
}

// ============================================
// RESPONSE PARSING HELPERS
// ============================================

export function parseQuestionResponse(
  questionNumber: number,
  rawResponse: any,
): any {
  // Section E responses (Q21–30) are strings/arrays — pass through as-is
  if (questionNumber >= 21) return rawResponse;

  // For Likert and frequency questions, ensure numeric conversion
  if (typeof rawResponse === "string" && !isNaN(Number(rawResponse))) {
    return Number(rawResponse);
  }

  return rawResponse;
}

// ============================================
// TEST HELPER (for development/debugging)
// ============================================

export function createTestResponses(
  inattScore: number,
  hyperScore: number,
  withGates: boolean = true,
): OnboardingResponse[] {
  const responses: OnboardingResponse[] = [];

  // Demographics (Q1–3)
  responses.push({ questionNumber: 1, response: "Male" });
  responses.push({ questionNumber: 2, response: "18-35" });
  responses.push({
    questionNumber: 3,
    response: withGates ? "childhood" : "adulthood",
  });

  // Inattention (Q4–9)
  INATT_ITEMS.forEach((item) => {
    responses.push({ questionNumber: item, response: inattScore });
  });

  // Hyperactivity (Q10–15)
  HYPER_ITEMS.forEach((item) => {
    responses.push({ questionNumber: item, response: hyperScore });
  });

  // Distraction (Q16)
  responses.push({ questionNumber: 16, response: "Social media" });

  // Impairment (Q17–20)
  responses.push({ questionNumber: 17, response: withGates ? 4 : 2 });
  responses.push({ questionNumber: 18, response: withGates ? 4 : 2 });
  responses.push({ questionNumber: 19, response: 3 });
  responses.push({ questionNumber: 20, response: withGates ? 4 : 2 });

  // Personalisation (Q21–30)
  responses.push({ questionNumber: 21, response: ["coding", "research"] });
  responses.push({ questionNumber: 22, response: "morning" });
  responses.push({ questionNumber: 23, response: "picks_up_phone" });
  responses.push({ questionNumber: 24, response: "youtube" });
  responses.push({ questionNumber: 25, response: "hyperfocus" });
  responses.push({ questionNumber: 26, response: "deadlines" });
  responses.push({ questionNumber: 27, response: "music" });
  responses.push({ questionNumber: 28, response: "humorous" });
  responses.push({ questionNumber: 29, response: "home" });
  responses.push({ questionNumber: 30, response: "music_rhythmic" });

  return responses.sort((a, b) => a.questionNumber - b.questionNumber);
}

// ============================================
// MIGRATION HELPER
// ============================================

export function migrate28To20Responses(
  responses28: OnboardingResponse[],
): OnboardingResponse[] {
  const questionMapping: Record<number, number> = {
    1: 1,
    2: 2,
    4: 3,
    6: 4,
    8: 5,
    9: 6,
    18: 7,
    23: 8,
    24: 9,
    7: 10,
    10: 11,
    12: 12,
    13: 13,
    20: 14,
    21: 15,
    16: 16,
    17: 17,
    22: 18,
    25: 19,
    26: 20,
  };

  const responses20: OnboardingResponse[] = [];

  responses28.forEach((r) => {
    const newId = questionMapping[r.questionNumber];
    if (newId) {
      responses20.push({ questionNumber: newId, response: r.response });
    }
  });

  return responses20;
}
