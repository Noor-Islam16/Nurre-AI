// Onboarding Question Data Structure (20-Question Version)
// Reduced from 28 to 20 questions while maintaining DSM-5 validity
// Based on OnboardingTest.md specification with optimizations

// ============================================
// INTERFACES
// ============================================

export interface Question {
  id: number;
  section: 'A' | 'B' | 'C' | 'D';
  type: 'gender' | 'age' | 'multiselect' | 'likert' | 'frequency' | 'binary' | 'onset' | 'single';
  text: string;
  options?: string[];
  values?: (number | string)[];
  domain?: 'inattention' | 'hyperactivity' | 'impairment';
  signalKey?: string; // For routing signals
  originalId?: number; // Track original question number from 28-question version
}

export interface Section {
  id: 'A' | 'B' | 'C' | 'D';
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
    section: 'A',
    type: 'gender',
    text: 'Gender',
    options: ['Female', 'Male'],
    values: ['female', 'male'],
    originalId: 1
  },
  {
    id: 2,
    section: 'A',
    type: 'age',
    text: 'Age',
    options: ['18–35', '36–45', '46–55', '56–64', '65+'],
    values: ['18-35', '36-45', '46-55', '56-64', '65+'],
    originalId: 2
  },
  {
    id: 3,
    section: 'A',
    type: 'onset',
    text: 'When did you start noticing struggles with concentration or activity levels?',
    options: [
      'In childhood (before 12)',
      'During adolescence (13–17)',
      'In adulthood (18+)',
      'Not sure'
    ],
    values: ['childhood', 'adolescence', 'adulthood', 'not_sure'],
    originalId: 4  // This was Q4 in original
  }
];

// ============================================
// SECTION B: CORE SYMPTOM ITEMS (12 questions)
// 6 Inattention + 6 Hyperactivity/Impulsivity
// ============================================

const sectionB: Question[] = [
  // Inattention items (6 most discriminative)
  {
    id: 4,
    section: 'B',
    type: 'likert',
    text: 'I find it difficult to remember appointments or obligations.',
    domain: 'inattention',
    originalId: 6
  },
  {
    id: 5,
    section: 'B',
    type: 'likert',
    text: 'I misplace or have trouble finding things at home or at work.',
    domain: 'inattention',
    signalKey: 'loses_things',
    originalId: 8
  },
  {
    id: 6,
    section: 'B',
    type: 'likert',
    text: "I can't focus, even when people talk to me.",
    domain: 'inattention',
    originalId: 9
  },
  {
    id: 7,
    section: 'B',
    type: 'likert',
    text: 'I make careless mistakes when I have to work on a boring or difficult project.',
    domain: 'inattention',
    signalKey: 'careless_mistakes',
    originalId: 18
  },
  {
    id: 8,
    section: 'B',
    type: 'likert',
    text: 'I struggle to stay organized when a task requires it.',
    domain: 'inattention',
    originalId: 23
  },
  {
    id: 9,
    section: 'B',
    type: 'likert',
    text: 'I put off thinking-intensive tasks.',
    domain: 'inattention',
    signalKey: 'avoids_effort',
    originalId: 24
  },
  // Hyperactivity/Impulsivity items (6 most discriminative)
  {
    id: 10,
    section: 'B',
    type: 'likert',
    text: 'I struggle to sit still in one place for a long time.',
    domain: 'hyperactivity',
    originalId: 7
  },
  {
    id: 11,
    section: 'B',
    type: 'likert',
    text: 'I often feel restless or fidgety.',
    domain: 'hyperactivity',
    signalKey: 'restless',
    originalId: 10
  },
  {
    id: 12,
    section: 'B',
    type: 'likert',
    text: 'I find it hard to wait for my turn (e.g., standing in line).',
    domain: 'hyperactivity',
    signalKey: 'waits_turn',
    originalId: 12
  },
  {
    id: 13,
    section: 'B',
    type: 'likert',
    text: 'I often interrupt others when they are busy.',
    domain: 'hyperactivity',
    signalKey: 'interrupts',
    originalId: 13
  },
  {
    id: 14,
    section: 'B',
    type: 'likert',
    text: 'I struggle to stay seated during meetings.',
    domain: 'hyperactivity',
    signalKey: 'leave_seat',
    originalId: 20
  },
  {
    id: 15,
    section: 'B',
    type: 'likert',
    text: 'I often feel "forced," like I\'m driven by a motor.',
    domain: 'hyperactivity',
    signalKey: 'driven_by_motor',
    originalId: 21
  }
];

// ============================================
// SECTION C: DISTRACTION BEHAVIOR (1 question)
// ============================================

const sectionC: Question[] = [
  {
    id: 16,
    section: 'C',
    type: 'single',
    text: 'What distracts you the most?',
    options: [
      'Social media',
      'Phone notifications',
      'Watching TV/videos',
      'Talking with colleagues',
      'None of the above'
    ],
    originalId: 16
  }
];

// ============================================
// SECTION D: IMPAIRMENT & SEVERITY (4 questions)
// ============================================

const sectionD: Question[] = [
  {
    id: 17,
    section: 'D',
    type: 'frequency',
    text: 'Do you feel overwhelmed while doing complex tasks?',
    options: ['Yes, always', 'Yes, often', 'From time to time', 'Rarely', 'Never'],
    values: [5, 4, 3, 2, 1],
    domain: 'impairment',
    originalId: 17
  },
  {
    id: 18,
    section: 'D',
    type: 'likert',
    text: 'Do you struggle with handling stress and tend to overreact in stressful situations?',
    domain: 'impairment',
    signalKey: 'overreact_stress',
    originalId: 22
  },
  {
    id: 19,
    section: 'D',
    type: 'frequency',
    text: 'How often do you find yourself day-dreaming while reading?',
    options: ['All the time', 'Often', 'Sometimes', 'Rarely', 'Never'],
    values: [5, 4, 3, 2, 1],
    signalKey: 'daydream_reading',
    originalId: 25
  },
  {
    id: 20,
    section: 'D',
    type: 'likert',
    text: 'I struggle to finish a project once the hard parts are done.',
    domain: 'impairment',
    originalId: 26
  }
];

// ============================================
// COMPLETE QUESTION LIST (20 questions)
// ============================================

export const ONBOARDING_QUESTIONS: Question[] = [
  ...sectionA,  // Questions 1-3
  ...sectionB,  // Questions 4-15
  ...sectionC,  // Question 16
  ...sectionD   // Questions 17-20
];

// ============================================
// SECTIONS STRUCTURE
// ============================================

export const SECTIONS: Section[] = [
  {
    id: 'A',
    title: 'Profile & Context',
    description: 'Basic information about you',
    questions: sectionA
  },
  {
    id: 'B',
    title: 'Core Symptoms',
    description: 'How you experience daily activities',
    questions: sectionB
  },
  {
    id: 'C',
    title: 'Distraction Patterns',
    description: 'What affects your focus',
    questions: sectionC
  },
  {
    id: 'D',
    title: 'Impact & Coping',
    description: 'How symptoms affect your life',
    questions: sectionD
  }
];

// ============================================
// HELPER CONSTANTS
// ============================================

export const LIKERT_LABELS = [
  'Strongly disagree',
  'Disagree',
  'Neither agree nor disagree',
  'Agree',
  'Strongly agree'
];

export const LIKERT_VALUES = [1, 2, 3, 4, 5];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a question by its ID
 */
export function getQuestionById(id: number): Question | undefined {
  return ONBOARDING_QUESTIONS.find(q => q.id === id);
}

/**
 * Get all questions for a specific section
 */
export function getQuestionsBySection(sectionId: 'A' | 'B' | 'C' | 'D'): Question[] {
  return ONBOARDING_QUESTIONS.filter(q => q.section === sectionId);
}

/**
 * Get all questions for a specific domain
 */
export function getQuestionsByDomain(domain: 'inattention' | 'hyperactivity' | 'impairment'): Question[] {
  return ONBOARDING_QUESTIONS.filter(q => q.domain === domain);
}

/**
 * Get question IDs for inattention domain (for scoring)
 * Updated for 20-question version
 */
export function getInattentionQuestionIds(): number[] {
  return [4, 5, 6, 7, 8, 9];  // 6 inattention questions
}

/**
 * Get question IDs for hyperactivity domain (for scoring)
 * Updated for 20-question version
 */
export function getHyperactivityQuestionIds(): number[] {
  return [10, 11, 12, 13, 14, 15];  // 6 hyperactivity questions
}

/**
 * Get question IDs for impairment assessment
 * Updated for 20-question version
 */
export function getImpairmentQuestionIds(): number[] {
  return [17, 18, 20];  // Questions 17, 18, and 20 are impairment indicators
  // Note: Q8 and Q9 also contribute to impairment but are primarily inattention
}

/**
 * Check if a question is a Likert scale question
 */
export function isLikertQuestion(questionId: number): boolean {
  const question = getQuestionById(questionId);
  return question?.type === 'likert';
}

/**
 * Get the numeric value for a response based on question type
 */
export function getResponseValue(questionId: number, response: string | number): number | string {
  const question = getQuestionById(questionId);
  if (!question) return response;
  
  // If values array is defined, map the response
  if (question.values && question.options) {
    const index = question.options.indexOf(response as string);
    if (index !== -1) {
      return question.values[index];
    }
  }
  
  // For Likert questions without explicit values, assume 1-5
  if (question.type === 'likert' && typeof response === 'string') {
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
export function validateAllQuestionsAnswered(responses: Map<number, any>): boolean {
  const requiredQuestionIds = ONBOARDING_QUESTIONS.map(q => q.id);
  return requiredQuestionIds.every(id => responses.has(id));
}

/**
 * Get progress percentage based on answered questions
 */
export function getProgressPercentage(responses: Map<number, any>): number {
  const totalQuestions = ONBOARDING_QUESTIONS.length;
  const answeredQuestions = ONBOARDING_QUESTIONS.filter(q => responses.has(q.id)).length;
  return Math.round((answeredQuestions / totalQuestions) * 100);
}

/**
 * Get the next unanswered question
 */
export function getNextUnansweredQuestion(responses: Map<number, any>): Question | undefined {
  return ONBOARDING_QUESTIONS.find(q => !responses.has(q.id));
}

/**
 * Format question for display (adds question number)
 */
export function formatQuestionText(question: Question): string {
  return `${question.id}. ${question.text}`;
}

/**
 * Map responses from 28-question format to 20-question format
 * Useful for migration
 */
export function mapFrom28To20Format(responses28: Map<number, any>): Map<number, any> {
  const responses20 = new Map<number, any>();
  
  ONBOARDING_QUESTIONS.forEach(q => {
    if (q.originalId && responses28.has(q.originalId)) {
      responses20.set(q.id, responses28.get(q.originalId));
    }
  });
  
  return responses20;
}