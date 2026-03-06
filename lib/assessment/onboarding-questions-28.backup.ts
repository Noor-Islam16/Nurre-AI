// Onboarding Question Data Structure
// Contains all 28 questions for DSM-5 based ADHD assessment
// Based on OnboardingTest.md specification

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
}

export interface Section {
  id: 'A' | 'B' | 'C' | 'D';
  title: string;
  description: string;
  questions: Question[];
}

// ============================================
// SECTION A: PROFILE & CONTEXT (Questions 1-4)
// ============================================

const sectionA: Question[] = [
  {
    id: 1,
    section: 'A',
    type: 'gender',
    text: 'Gender',
    options: ['Female', 'Male'],
    values: ['female', 'male']
  },
  {
    id: 2,
    section: 'A',
    type: 'age',
    text: 'Age',
    options: ['18–35', '36–45', '46–55', '56–64', '65+'],
    values: ['18-35', '36-45', '46-55', '56-64', '65+']
  },
  {
    id: 3,
    section: 'A',
    type: 'multiselect',
    text: 'Which symptoms do you relate to?',
    options: [
      'Low motivation',
      'Non-stop racing thoughts',
      'Low self-esteem',
      'Constant mood swings',
      'Forgetfulness',
      'Disorganization',
      'Impulsivity',
      'None of the above'
    ]
  },
  {
    id: 4,
    section: 'A',
    type: 'onset',
    text: 'When did you start noticing struggles with concentration or activity levels?',
    options: [
      'In childhood (before 12)',
      'During adolescence (13–17)',
      'In adulthood (18+)',
      'Not sure'
    ],
    values: ['childhood', 'adolescence', 'adulthood', 'not_sure']
  }
];

// ============================================
// SECTION B: CORE SYMPTOM ITEMS (Questions 5-21)
// ============================================

const sectionB: Question[] = [
  // Inattention items first (based on OnboardingTest.md numbering)
  {
    id: 5,
    section: 'B',
    type: 'likert',
    text: 'I forget words or expressions in the middle of a conversation.',
    domain: 'inattention'
  },
  {
    id: 6,
    section: 'B',
    type: 'likert',
    text: 'I find it difficult to remember appointments or obligations.',
    domain: 'inattention'
  },
  {
    id: 7,
    section: 'B',
    type: 'likert',
    text: 'I struggle to sit still in one place for a long time.',
    domain: 'hyperactivity'
  },
  {
    id: 8,
    section: 'B',
    type: 'likert',
    text: 'I misplace or have trouble finding things at home or at work.',
    domain: 'inattention',
    signalKey: 'loses_things'
  },
  {
    id: 9,
    section: 'B',
    type: 'likert',
    text: "I can't focus, even when people talk to me.",
    domain: 'inattention'
  },
  {
    id: 10,
    section: 'B',
    type: 'likert',
    text: 'I often feel restless or fidgety.',
    domain: 'hyperactivity',
    signalKey: 'restless'
  },
  {
    id: 11,
    section: 'B',
    type: 'likert',
    text: 'I find myself talking too much in social situations.',
    domain: 'hyperactivity'
  },
  {
    id: 12,
    section: 'B',
    type: 'likert',
    text: 'I find it hard to wait for my turn (e.g., standing in line).',
    domain: 'hyperactivity',
    signalKey: 'waits_turn'
  },
  {
    id: 13,
    section: 'B',
    type: 'likert',
    text: 'I often interrupt others when they are busy.',
    domain: 'hyperactivity',
    signalKey: 'interrupts'
  },
  {
    id: 14,
    section: 'B',
    type: 'likert',
    text: 'I struggle to relax, even with a lot of spare time.',
    domain: 'hyperactivity'
  },
  {
    id: 15,
    section: 'B',
    type: 'likert',
    text: "I'm easily distracted by activity or noise around me.",
    domain: 'inattention'
  },
  // Gap in numbering - questions 16-17 are in Section C
  {
    id: 18,
    section: 'B',
    type: 'likert',
    text: 'I make careless mistakes when I have to work on a boring or difficult project.',
    domain: 'inattention',
    signalKey: 'careless_mistakes'
  },
  {
    id: 19,
    section: 'B',
    type: 'likert',
    text: 'I struggle to stay focused on boring tasks.',
    domain: 'inattention'
  },
  {
    id: 20,
    section: 'B',
    type: 'likert',
    text: 'I struggle to stay seated during meetings.',
    domain: 'hyperactivity',
    signalKey: 'leave_seat'
  },
  {
    id: 21,
    section: 'B',
    type: 'likert',
    text: 'I often feel "forced," like I\'m driven by a motor.',
    domain: 'hyperactivity',
    signalKey: 'driven_by_motor'
  }
];

// ============================================
// SECTION C: DISTRACTION BEHAVIOR (Questions 16-17)
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
    ]
  },
  {
    id: 17,
    section: 'C',
    type: 'frequency',
    text: 'Do you feel overwhelmed while doing complex tasks?',
    options: ['Yes, always', 'Yes, often', 'From time to time', 'Rarely', 'Never'],
    values: [5, 4, 3, 2, 1],
    domain: 'impairment'
  }
];

// ============================================
// SECTION D: OVERLOAD/STRESS/MOOD & READING (Questions 22-28)
// ============================================

const sectionD: Question[] = [
  {
    id: 22,
    section: 'D',
    type: 'likert',
    text: 'Do you struggle with handling stress and tend to overreact in stressful situations?',
    domain: 'impairment',
    signalKey: 'overreact_stress'
  },
  {
    id: 23,
    section: 'D',
    type: 'likert',
    text: 'I struggle to stay organized when a task requires it.',
    domain: 'inattention'
  },
  {
    id: 24,
    section: 'D',
    type: 'likert',
    text: 'I put off thinking-intensive tasks.',
    domain: 'inattention',
    signalKey: 'avoids_effort'
  },
  {
    id: 25,
    section: 'D',
    type: 'frequency',
    text: 'How often do you find yourself day-dreaming while reading?',
    options: ['All the time', 'Often', 'Sometimes', 'Rarely', 'Never'],
    values: [5, 4, 3, 2, 1],
    signalKey: 'daydream_reading'
  },
  {
    id: 26,
    section: 'D',
    type: 'likert',
    text: 'I struggle to finish a project once the hard parts are done.',
    domain: 'inattention'
  },
  {
    id: 27,
    section: 'D',
    type: 'frequency',
    text: 'Do you doubt yourself?',
    options: ['Always', 'Often', 'Sometimes', 'Rarely'],
    values: [4, 3, 2, 1]
  },
  {
    id: 28,
    section: 'D',
    type: 'binary',
    text: 'Do you agree with the statement "Attention is like a muscle; the more you exercise it, the stronger it gets"?',
    options: ['Yes', 'No'],
    values: [1, 0]
  }
];

// ============================================
// COMPLETE QUESTION LIST
// ============================================

export const ONBOARDING_QUESTIONS: Question[] = [
  ...sectionA,
  ...sectionB.slice(0, 11), // Questions 5-15
  ...sectionC,              // Questions 16-17
  ...sectionB.slice(11),    // Questions 18-21
  ...sectionD               // Questions 22-28
].sort((a, b) => a.id - b.id); // Ensure proper ordering

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
 */
export function getInattentionQuestionIds(): number[] {
  return [6, 8, 9, 15, 18, 19, 23, 24, 26];
}

/**
 * Get question IDs for hyperactivity domain (for scoring)
 */
export function getHyperactivityQuestionIds(): number[] {
  return [7, 10, 11, 12, 13, 14, 20, 21];
}

/**
 * Get question IDs for impairment assessment
 */
export function getImpairmentQuestionIds(): number[] {
  return [17, 22, 23, 24, 26];
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