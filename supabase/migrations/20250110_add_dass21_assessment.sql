-- supabase/migrations/20250110_add_dass21_assessment.sql
-- Add DASS-21 (Depression Anxiety Stress Scales - 21 Items) Assessment
-- Based on the standard DASS-21 by Lovibond & Lovibond (1995)
-- Status: COMPLETED



INSERT INTO assessments (type, name, description, version, questions, scoring_rules, interpretation_guide, time_estimate) VALUES
(
  'dass21',
  'Depression Anxiety Stress Scales (DASS-21)',
  'A comprehensive 21-item self-report measure assessing depression, anxiety, and stress symptoms. Widely used in clinical and research settings.',
  '21',
  '[
    {
      "id": 1,
      "text": "I found it hard to wind down",
      "subscale": "stress",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 2,
      "text": "I was aware of dryness of my mouth",
      "subscale": "anxiety",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 3,
      "text": "I couldn''t seem to experience any positive feeling at all",
      "subscale": "depression",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 4,
      "text": "I experienced breathing difficulty (e.g. excessively rapid breathing, breathlessness in the absence of physical exertion)",
      "subscale": "anxiety",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 5,
      "text": "I found it difficult to work up the initiative to do things",
      "subscale": "depression",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 6,
      "text": "I tended to over-react to situations",
      "subscale": "stress",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 7,
      "text": "I experienced trembling (e.g. in the hands)",
      "subscale": "anxiety",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 8,
      "text": "I felt that I was using a lot of nervous energy",
      "subscale": "stress",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 9,
      "text": "I was worried about situations in which I might panic and make a fool of myself",
      "subscale": "anxiety",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 10,
      "text": "I felt that I had nothing to look forward to",
      "subscale": "depression",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 11,
      "text": "I found myself getting agitated",
      "subscale": "stress",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 12,
      "text": "I found it difficult to relax",
      "subscale": "stress",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 13,
      "text": "I felt down-hearted and blue",
      "subscale": "depression",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 14,
      "text": "I was intolerant of anything that kept me from getting on with what I was doing",
      "subscale": "stress",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 15,
      "text": "I felt I was close to panic",
      "subscale": "anxiety",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 16,
      "text": "I was unable to become enthusiastic about anything",
      "subscale": "depression",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 17,
      "text": "I felt I wasn''t worth much as a person",
      "subscale": "depression",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 18,
      "text": "I felt that I was rather touchy",
      "subscale": "stress",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 19,
      "text": "I was aware of the action of my heart in the absence of physical exertion (e.g. sense of heart rate increase, heart missing a beat)",
      "subscale": "anxiety",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 20,
      "text": "I felt scared without any good reason",
      "subscale": "anxiety",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 21,
      "text": "I felt that life was meaningless",
      "subscale": "depression",
      "options": ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree or a good part of time", "Applied to me very much or most of the time"],
      "values": [0, 1, 2, 3]
    }
  ]',
  '{
    "scoring_method": "sum",
    "total_score": true,
    "subscales": {
      "depression": {
        "questions": [3, 5, 10, 13, 16, 17, 21],
        "label": "Depression"
      },
      "anxiety": {
        "questions": [2, 4, 7, 9, 15, 19, 20],
        "label": "Anxiety"
      },
      "stress": {
        "questions": [1, 6, 8, 11, 12, 14, 18],
        "label": "Stress"
      }
    }
  }',
  '{
    "ranges": [
      {
        "min": 0,
        "max": 9,
        "level": "normal",
        "label": "Normal",
        "description": "Within normal range",
        "recommendation": "No intervention needed"
      },
      {
        "min": 10,
        "max": 20,
        "level": "mild",
        "label": "Mild",
        "description": "Mild symptoms present",
        "recommendation": "Monitor symptoms and consider self-help strategies"
      },
      {
        "min": 21,
        "max": 41,
        "level": "moderate",
        "label": "Moderate",
        "description": "Moderate symptoms affecting daily life",
        "recommendation": "Consider professional support and counseling"
      },
      {
        "min": 42,
        "max": 63,
        "level": "severe",
        "label": "Severe",
        "description": "Severe symptoms significantly impacting functioning",
        "recommendation": "Seek professional mental health support"
      }
    ],
    "subscales": {
      "depression": [
        {
          "min": 0,
          "max": 4,
          "level": "normal",
          "label": "Normal",
          "description": "No significant depressive symptoms",
          "recommendation": "No intervention needed"
        },
        {
          "min": 5,
          "max": 6,
          "level": "mild",
          "label": "Mild Depression",
          "description": "Mild depressive symptoms",
          "recommendation": "Monitor mood and practice self-care"
        },
        {
          "min": 7,
          "max": 10,
          "level": "moderate",
          "label": "Moderate Depression",
          "description": "Moderate depressive symptoms",
          "recommendation": "Consider counseling or therapy"
        },
        {
          "min": 11,
          "max": 13,
          "level": "severe",
          "label": "Severe Depression",
          "description": "Severe depressive symptoms",
          "recommendation": "Seek professional mental health support"
        },
        {
          "min": 14,
          "max": 21,
          "level": "extremely_severe",
          "label": "Extremely Severe Depression",
          "description": "Extremely severe depressive symptoms",
          "recommendation": "Urgent professional intervention recommended"
        }
      ],
      "anxiety": [
        {
          "min": 0,
          "max": 3,
          "level": "normal",
          "label": "Normal",
          "description": "No significant anxiety",
          "recommendation": "No intervention needed"
        },
        {
          "min": 4,
          "max": 5,
          "level": "mild",
          "label": "Mild Anxiety",
          "description": "Mild anxiety symptoms",
          "recommendation": "Practice relaxation techniques"
        },
        {
          "min": 6,
          "max": 7,
          "level": "moderate",
          "label": "Moderate Anxiety",
          "description": "Moderate anxiety symptoms",
          "recommendation": "Consider anxiety management strategies and counseling"
        },
        {
          "min": 8,
          "max": 9,
          "level": "severe",
          "label": "Severe Anxiety",
          "description": "Severe anxiety symptoms",
          "recommendation": "Seek professional support for anxiety management"
        },
        {
          "min": 10,
          "max": 21,
          "level": "extremely_severe",
          "label": "Extremely Severe Anxiety",
          "description": "Extremely severe anxiety symptoms",
          "recommendation": "Urgent professional intervention recommended"
        }
      ],
      "stress": [
        {
          "min": 0,
          "max": 7,
          "level": "normal",
          "label": "Normal",
          "description": "Normal stress levels",
          "recommendation": "Maintain healthy stress management habits"
        },
        {
          "min": 8,
          "max": 9,
          "level": "mild",
          "label": "Mild Stress",
          "description": "Mild stress symptoms",
          "recommendation": "Focus on stress reduction activities"
        },
        {
          "min": 10,
          "max": 12,
          "level": "moderate",
          "label": "Moderate Stress",
          "description": "Moderate stress levels",
          "recommendation": "Implement stress management techniques and consider support"
        },
        {
          "min": 13,
          "max": 16,
          "level": "severe",
          "label": "Severe Stress",
          "description": "High stress levels",
          "recommendation": "Seek stress management support and counseling"
        },
        {
          "min": 17,
          "max": 21,
          "level": "extremely_severe",
          "label": "Extremely Severe Stress",
          "description": "Extremely high stress levels",
          "recommendation": "Urgent stress management intervention needed"
        }
      ]
    }
  }',
  10
)
ON CONFLICT (type) 
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  questions = EXCLUDED.questions,
  scoring_rules = EXCLUDED.scoring_rules,
  interpretation_guide = EXCLUDED.interpretation_guide,
  time_estimate = EXCLUDED.time_estimate,
  updated_at = TIMEZONE('utc', NOW());

-- Add index for DASS-21 responses if needed
CREATE INDEX IF NOT EXISTS idx_assessment_responses_dass21 
ON assessment_responses(assessment_type) 
WHERE assessment_type = 'dass21';