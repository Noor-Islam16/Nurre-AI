// Onboarding Scoring Engine (20-Question Version)
// Updated for reduced assessment while maintaining DSM-5 validity
// Based on OnboardingTest.md with adjusted thresholds

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
  screen: 'combined' | 'inattentive' | 'hyperactive' | 'borderline' | 'negative';
  routing: {
    topSignals: string[];
  };
}

// ============================================
// DOMAIN MAPPINGS (Updated for 20 questions)
// ============================================

// Question numbers for each domain - Updated for 20-question version
const INATT_ITEMS = [4, 5, 6, 7, 8, 9];      // 6 inattention items
const HYPER_ITEMS = [10, 11, 12, 13, 14, 15]; // 6 hyperactivity items

// Items used for impairment gate assessment - Updated
const IMPAIRMENT_ITEMS = [17, 18, 20];  // 3 primary impairment items
// Note: Q8 and Q9 also indicate impairment but are primarily inattention

// Signal mapping for personalized routing - Updated question numbers
const SIGNAL_MAP: Record<number, string> = {
  5: 'loses_things',        // was Q8
  9: 'avoids_effort',       // was Q24
  7: 'careless_mistakes',   // was Q18
  11: 'restless',           // was Q10
  14: 'leave_seat',         // was Q20
  15: 'driven_by_motor',    // was Q21
  13: 'interrupts',         // was Q13
  12: 'waits_turn',         // was Q12
  19: 'daydream_reading',   // was Q25
  18: 'overreact_stress'    // was Q22
};

// ============================================
// MAIN SCORING FUNCTION
// ============================================

export function scoreAssessment(responses: OnboardingResponse[]): ScoringResult {
  // 1. Parse responses into a map for easy lookup
  const responseMap = new Map<number, any>();
  responses.forEach(r => {
    responseMap.set(r.questionNumber, r.response);
  });
  
  // 2. Check onset gate (Q3 in 20-question version, was Q4)
  const onsetChildhood = checkOnsetGate(responseMap.get(3));
  
  // 3. Calculate domain endorsements (≥4 on 1-5 scale)
  const inattEndorsed = countEndorsed(INATT_ITEMS, responseMap);
  const hyperEndorsed = countEndorsed(HYPER_ITEMS, responseMap);
  
  // 4. Calculate severity percentages
  const inattSeverity = calculateSeverity(INATT_ITEMS, responseMap);
  const hyperSeverity = calculateSeverity(HYPER_ITEMS, responseMap);
  
  // 5. Check impairment gate (≥2 items endorsed)
  const impairment = checkImpairmentGate(IMPAIRMENT_ITEMS, responseMap);
  
  // 6. Determine presentation type using adjusted thresholds
  const screen = determinePresentation(
    inattEndorsed,
    hyperEndorsed,
    onsetChildhood,
    impairment
  );
  
  // 7. Identify top signals for routing
  const topSignals = identifyTopSignals(responseMap);
  
  return {
    counts: {
      inattEndorsed,
      hyperEndorsed,
      totalEndorsed: inattEndorsed + hyperEndorsed
    },
    severity: {
      inatt: inattSeverity,
      hyper: hyperSeverity
    },
    gates: {
      onsetChildhood,
      impairment
    },
    screen,
    routing: {
      topSignals
    }
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function isEndorsed(value: number): boolean {
  // Threshold for 1-5 scale (≥4 means "Agree" or "Often")
  return value >= 4;
}

function countEndorsed(items: number[], responseMap: Map<number, any>): number {
  return items.filter(item => {
    const value = responseMap.get(item);
    return typeof value === 'number' && isEndorsed(value);
  }).length;
}

function calculateSeverity(items: number[], responseMap: Map<number, any>): number {
  const values = items.map(item => {
    const value = responseMap.get(item);
    // Convert 1-5 scale to 0-1 range: (value - 1) / 4
    return typeof value === 'number' ? (value - 1) / 4 : 0;
  });
  
  // Calculate mean and convert to percentage
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(mean * 100);
}

function checkOnsetGate(response: string | undefined): boolean {
  // DSM-5 requires symptoms before age 12
  // We include adolescence (13-17) for a more inclusive screen
  return response === 'childhood' || response === 'adolescence';
}

function checkImpairmentGate(items: number[], responseMap: Map<number, any>): boolean {
  // Require at least 2 impairment items to be endorsed
  // With only 3 primary impairment items, this maintains stringency
  const endorsedCount = countEndorsed(items, responseMap);
  return endorsedCount >= 2;
}

function determinePresentation(
  inatt: number,
  hyper: number,
  onset: boolean,
  impairment: boolean
): ScoringResult['screen'] {
  // UPDATED THRESHOLDS for 20-question version:
  // Using ≥4/6 (67%) which is slightly more stringent than DSM-5's 5/9 (56%)
  // This compensates for having fewer items to assess each domain
  const positiveInatt = inatt >= 4;  // ≥4/6 for inattention
  const positiveHyper = hyper >= 4;  // ≥4/6 for hyperactivity
  const passesGates = onset && impairment;
  
  // Apply DSM-5 based classification rules
  if (positiveInatt && positiveHyper && passesGates) {
    return 'combined';
  } else if (positiveInatt && passesGates) {
    return 'inattentive';
  } else if (positiveHyper && passesGates) {
    return 'hyperactive';
  } else if (inatt === 3 || hyper === 3) {
    // Borderline: exactly 3/6 (50%) in either domain
    return 'borderline';
  } else {
    return 'negative';
  }
}

function identifyTopSignals(responseMap: Map<number, any>): string[] {
  const signals: Array<{signal: string, score: number}> = [];
  
  // Check each signal-mapped question
  for (const [question, signal] of Object.entries(SIGNAL_MAP)) {
    const value = responseMap.get(Number(question));
    if (typeof value === 'number' && value >= 4) {
      signals.push({ signal, score: value });
    }
  }
  
  // Return top 3 highest-scoring signals
  return signals
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.signal);
}

// ============================================
// VALIDATION FUNCTION
// ============================================

export function validateResponses(responses: OnboardingResponse[]): boolean {
  // Ensure all required questions (1-20) are answered
  const requiredQuestions = new Set([...Array(20).keys()].map(i => i + 1));
  const answeredQuestions = new Set(responses.map(r => r.questionNumber));
  
  return requiredQuestions.size === answeredQuestions.size &&
         [...requiredQuestions].every(q => answeredQuestions.has(q));
}

// ============================================
// RESPONSE PARSING HELPERS
// ============================================

export function parseQuestionResponse(questionNumber: number, rawResponse: any): any {
  // Questions 1-3 are demographic/context (text responses)
  if (questionNumber <= 3) {
    return rawResponse;
  }
  
  // Questions 4-15 are Likert scale (1-5)
  // Question 16 is multiple choice (stored as text)
  // Questions 17-20 are various scales
  
  // For Likert and frequency questions, ensure numeric conversion
  if (typeof rawResponse === 'string' && !isNaN(Number(rawResponse))) {
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
  withGates: boolean = true
): OnboardingResponse[] {
  const responses: OnboardingResponse[] = [];
  
  // Demographics (Q1-3)
  responses.push({ questionNumber: 1, response: 'Male' });
  responses.push({ questionNumber: 2, response: '18-35' });
  responses.push({ 
    questionNumber: 3, 
    response: withGates ? 'childhood' : 'adulthood' 
  });
  
  // Set scores for inattention items (Q4-9)
  INATT_ITEMS.forEach(item => {
    responses.push({ questionNumber: item, response: inattScore });
  });
  
  // Set scores for hyperactivity items (Q10-15)
  HYPER_ITEMS.forEach(item => {
    responses.push({ questionNumber: item, response: hyperScore });
  });
  
  // Distraction question (Q16)
  responses.push({ questionNumber: 16, response: 'Social media' });
  
  // Impairment questions (Q17, 18, 20)
  responses.push({ 
    questionNumber: 17, 
    response: withGates ? 4 : 2 
  });
  responses.push({ 
    questionNumber: 18, 
    response: withGates ? 4 : 2 
  });
  responses.push({ 
    questionNumber: 19, 
    response: 3  // Neutral for daydreaming
  });
  responses.push({ 
    questionNumber: 20, 
    response: withGates ? 4 : 2 
  });
  
  return responses.sort((a, b) => a.questionNumber - b.questionNumber);
}

// ============================================
// MIGRATION HELPER
// ============================================

/**
 * Map responses from 28-question format to 20-question format
 * Uses the originalId mapping from the questions structure
 */
export function migrate28To20Responses(responses28: OnboardingResponse[]): OnboardingResponse[] {
  // Mapping from old question IDs to new question IDs
  const questionMapping: Record<number, number> = {
    1: 1,   // Gender
    2: 2,   // Age
    4: 3,   // Onset (was Q4, now Q3)
    6: 4,   // Remember appointments
    8: 5,   // Misplace things
    9: 6,   // Can't focus
    18: 7,  // Careless mistakes
    23: 8,  // Stay organized
    24: 9,  // Avoid tasks
    7: 10,  // Sit still
    10: 11, // Restless
    12: 12, // Wait turn
    13: 13, // Interrupt
    20: 14, // Stay seated
    21: 15, // Driven by motor
    16: 16, // What distracts
    17: 17, // Overwhelmed
    22: 18, // Overreact stress
    25: 19, // Daydream reading
    26: 20  // Finish projects
  };
  
  const responses20: OnboardingResponse[] = [];
  
  responses28.forEach(r => {
    const newId = questionMapping[r.questionNumber];
    if (newId) {
      responses20.push({
        questionNumber: newId,
        response: r.response
      });
    }
  });
  
  return responses20;
}