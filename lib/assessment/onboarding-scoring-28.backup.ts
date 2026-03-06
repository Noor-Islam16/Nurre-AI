// Onboarding Scoring Engine
// Implements DSM-5 based ADHD screening assessment scoring algorithm
// Based on 28-item assessment from OnboardingTest.md

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
// DOMAIN MAPPINGS
// ============================================

// Question numbers for each domain (from OnboardingTest.md Section 2.2)
const INATT_ITEMS = [6, 8, 9, 15, 18, 19, 23, 24, 26];
const HYPER_ITEMS = [7, 10, 11, 12, 13, 14, 20, 21];

// Items used for impairment gate assessment
const IMPAIRMENT_ITEMS = [17, 22, 23, 24, 26];

// Signal mapping for personalized routing (from OnboardingTest.md Section 2.8)
const SIGNAL_MAP: Record<number, string> = {
  8: 'loses_things',
  24: 'avoids_effort',
  18: 'careless_mistakes',
  10: 'restless',
  20: 'leave_seat',
  21: 'driven_by_motor',
  13: 'interrupts',
  12: 'waits_turn',
  25: 'daydream_reading',
  22: 'overreact_stress'
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
  
  // 2. Check onset gate (Q4)
  const onsetChildhood = checkOnsetGate(responseMap.get(4));
  
  // 3. Calculate domain endorsements (≥4 on 1-5 scale)
  const inattEndorsed = countEndorsed(INATT_ITEMS, responseMap);
  const hyperEndorsed = countEndorsed(HYPER_ITEMS, responseMap);
  
  // 4. Calculate severity percentages
  const inattSeverity = calculateSeverity(INATT_ITEMS, responseMap);
  const hyperSeverity = calculateSeverity(HYPER_ITEMS, responseMap);
  
  // 5. Check impairment gate (≥2 items endorsed)
  const impairment = checkImpairmentGate(IMPAIRMENT_ITEMS, responseMap);
  
  // 6. Determine presentation type using DSM-5 thresholds
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
  const endorsedCount = countEndorsed(items, responseMap);
  return endorsedCount >= 2;
}

function determinePresentation(
  inatt: number,
  hyper: number,
  onset: boolean,
  impairment: boolean
): ScoringResult['screen'] {
  // DSM-5 thresholds for adults:
  // Inattentive: ≥5/9 items
  // Hyperactive: ≥5/8 items (scaled from DSM's 5/9 due to having 8 items)
  const positiveInatt = inatt >= 5;
  const positiveHyper = hyper >= 5;
  const passesGates = onset && impairment;
  
  // Apply DSM-5 based classification rules
  if (positiveInatt && positiveHyper && passesGates) {
    return 'combined';
  } else if (positiveInatt && passesGates) {
    return 'inattentive';
  } else if (positiveHyper && passesGates) {
    return 'hyperactive';
  } else if ((inatt >= 3 && inatt <= 4) || (hyper >= 3 && hyper <= 4)) {
    // Borderline: close to threshold but not meeting full criteria
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
  // Ensure all required questions (1-28) are answered
  const requiredQuestions = new Set([...Array(28).keys()].map(i => i + 1));
  const answeredQuestions = new Set(responses.map(r => r.questionNumber));
  
  return requiredQuestions.size === answeredQuestions.size &&
         [...requiredQuestions].every(q => answeredQuestions.has(q));
}

// ============================================
// RESPONSE PARSING HELPERS
// ============================================

export function parseQuestionResponse(questionNumber: number, rawResponse: any): any {
  // Questions 1-4 are demographic/context (text responses)
  if (questionNumber <= 4) {
    return rawResponse;
  }
  
  // Questions 5-15 are Likert scale (1-5)
  // Questions 16a, 16b are multiple choice (stored as text)
  // Questions 17, 22, 25, 27, 28 are various scales
  
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
  
  // Demographics (Q1-4)
  responses.push({ questionNumber: 1, response: 'Male' });
  responses.push({ questionNumber: 2, response: '18-35' });
  responses.push({ questionNumber: 3, response: ['Low motivation', 'Forgetfulness'] });
  responses.push({ 
    questionNumber: 4, 
    response: withGates ? 'childhood' : 'adulthood' 
  });
  
  // Set scores for inattention items
  INATT_ITEMS.forEach(item => {
    responses.push({ questionNumber: item, response: inattScore });
  });
  
  // Set scores for hyperactivity items
  HYPER_ITEMS.forEach(item => {
    responses.push({ questionNumber: item, response: hyperScore });
  });
  
  // Fill remaining questions with neutral responses
  for (let i = 1; i <= 28; i++) {
    if (!responses.find(r => r.questionNumber === i)) {
      if (i === 16) {
        responses.push({ questionNumber: i, response: 'Social media' });
      } else if (i === 17 || i === 22 || i === 25 || i === 27) {
        // Impairment-related questions
        responses.push({ 
          questionNumber: i, 
          response: withGates ? 4 : 2 
        });
      } else if (i === 28) {
        responses.push({ questionNumber: i, response: 'Yes' });
      } else {
        responses.push({ questionNumber: i, response: 3 });
      }
    }
  }
  
  return responses.sort((a, b) => a.questionNumber - b.questionNumber);
}