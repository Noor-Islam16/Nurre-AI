-- supabase/migrations/20250103_create_assessments_tables.sql
-- Status: COMPLETED


-- Create assessments table for storing assessment templates
CREATE TABLE IF NOT EXISTS assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL UNIQUE, -- 'asrs', 'phq9', 'gad7', 'dass21'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  questions JSONB NOT NULL, -- Array of question objects
  scoring_rules JSONB NOT NULL, -- Scoring logic and interpretation
  interpretation_guide JSONB NOT NULL, -- Score ranges and their meanings
  time_estimate INTEGER, -- Estimated completion time in minutes
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create assessment_responses table for user responses
CREATE TABLE IF NOT EXISTS assessment_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id),
  assessment_type VARCHAR(50) NOT NULL, -- Denormalized for quick querying
  responses JSONB NOT NULL, -- User's answers to questions
  scores JSONB NOT NULL, -- Calculated scores and subscores
  severity_level VARCHAR(50), -- 'none', 'mild', 'moderate', 'severe'
  time_taken INTEGER, -- Time in seconds to complete
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  is_complete BOOLEAN DEFAULT true,
  
  -- Additional metadata
  notes TEXT, -- Any additional notes from the assessment
  shared_with_provider BOOLEAN DEFAULT false,
  provider_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create assessment_progress table for incomplete assessments
CREATE TABLE IF NOT EXISTS assessment_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id),
  current_question_index INTEGER DEFAULT 0,
  responses JSONB DEFAULT '{}', -- Partial responses
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW() + INTERVAL '7 days'), -- Auto-cleanup old incomplete assessments
  
  UNIQUE(user_id, assessment_id) -- Only one in-progress assessment per type per user
);

-- Indexes for performance
CREATE INDEX idx_assessment_responses_user_id ON assessment_responses(user_id);
CREATE INDEX idx_assessment_responses_type ON assessment_responses(assessment_type);
CREATE INDEX idx_assessment_responses_completed_at ON assessment_responses(completed_at DESC);
CREATE INDEX idx_assessment_responses_user_type ON assessment_responses(user_id, assessment_type);
CREATE INDEX idx_assessment_progress_user_id ON assessment_progress(user_id);
CREATE INDEX idx_assessment_progress_expires ON assessment_progress(expires_at);

-- Row Level Security
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_progress ENABLE ROW LEVEL SECURITY;

-- Assessments are viewable by all authenticated users
CREATE POLICY "Assessments are viewable by authenticated users"
  ON assessments FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can only see their own responses
CREATE POLICY "Users can view own assessment responses"
  ON assessment_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assessment responses"
  ON assessment_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessment responses"
  ON assessment_responses FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only manage their own progress
CREATE POLICY "Users can manage own assessment progress"
  ON assessment_progress FOR ALL
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_assessment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

CREATE TRIGGER update_assessment_responses_updated_at
  BEFORE UPDATE ON assessment_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_assessment_updated_at();

-- Insert initial assessment templates
INSERT INTO assessments (type, name, description, version, questions, scoring_rules, interpretation_guide, time_estimate) VALUES
(
  'asrs',
  'Adult ADHD Self-Report Scale (ASRS-v1.1)',
  'WHO/Harvard Medical School screening tool for adult ADHD symptoms. Used by UK NHS for initial ADHD assessment.',
  '1.1',
  '[
    {
      "id": 1,
      "section": "A",
      "text": "How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?",
      "options": ["Never", "Rarely", "Sometimes", "Often", "Very Often"],
      "values": [0, 1, 2, 3, 4]
    },
    {
      "id": 2,
      "section": "A",
      "text": "How often do you have difficulty getting things in order when you have to do a task that requires organization?",
      "options": ["Never", "Rarely", "Sometimes", "Often", "Very Often"],
      "values": [0, 1, 2, 3, 4]
    },
    {
      "id": 3,
      "section": "A",
      "text": "How often do you have problems remembering appointments or obligations?",
      "options": ["Never", "Rarely", "Sometimes", "Often", "Very Often"],
      "values": [0, 1, 2, 3, 4]
    },
    {
      "id": 4,
      "section": "A",
      "text": "When you have a task that requires a lot of thought, how often do you avoid or delay getting started?",
      "options": ["Never", "Rarely", "Sometimes", "Often", "Very Often"],
      "values": [0, 1, 2, 3, 4]
    },
    {
      "id": 5,
      "section": "A",
      "text": "How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?",
      "options": ["Never", "Rarely", "Sometimes", "Often", "Very Often"],
      "values": [0, 1, 2, 3, 4]
    },
    {
      "id": 6,
      "section": "A",
      "text": "How often do you feel overly active and compelled to do things, like you were driven by a motor?",
      "options": ["Never", "Rarely", "Sometimes", "Often", "Very Often"],
      "values": [0, 1, 2, 3, 4]
    }
  ]',
  '{
    "scoring_method": "sum",
    "sections": {
      "A": {
        "questions": [1, 2, 3, 4, 5, 6],
        "threshold": 14,
        "description": "Part A screener - 6 most predictive questions"
      }
    },
    "total_threshold": 14
  }',
  '{
    "ranges": [
      {
        "min": 0,
        "max": 13,
        "level": "low",
        "label": "Unlikely ADHD",
        "description": "Symptoms are not consistent with adult ADHD",
        "recommendation": "Continue monitoring if concerns persist"
      },
      {
        "min": 14,
        "max": 24,
        "level": "moderate",
        "label": "Possible ADHD",
        "description": "Symptoms suggest possible adult ADHD",
        "recommendation": "Consider discussing with your GP for formal assessment"
      }
    ]
  }',
  5
),
(
  'phq9',
  'Patient Health Questionnaire-9 (PHQ-9)',
  'Standard UK NHS depression screening tool. Assesses depression severity over the past 2 weeks.',
  '1.0',
  '[
    {
      "id": 1,
      "text": "Little interest or pleasure in doing things",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 2,
      "text": "Feeling down, depressed, or hopeless",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 3,
      "text": "Trouble falling or staying asleep, or sleeping too much",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 4,
      "text": "Feeling tired or having little energy",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 5,
      "text": "Poor appetite or overeating",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 6,
      "text": "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 7,
      "text": "Trouble concentrating on things, such as reading the newspaper or watching television",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 8,
      "text": "Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 9,
      "text": "Thoughts that you would be better off dead or of hurting yourself in some way",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    }
  ]',
  '{
    "scoring_method": "sum",
    "total_score": true,
    "critical_items": [9]
  }',
  '{
    "ranges": [
      {
        "min": 0,
        "max": 4,
        "level": "none",
        "label": "Minimal Depression",
        "description": "No significant depressive symptoms",
        "recommendation": "No intervention needed"
      },
      {
        "min": 5,
        "max": 9,
        "level": "mild",
        "label": "Mild Depression",
        "description": "Few depressive symptoms present",
        "recommendation": "Watchful waiting; repeat PHQ-9 at follow-up"
      },
      {
        "min": 10,
        "max": 14,
        "level": "moderate",
        "label": "Moderate Depression",
        "description": "Moderate depressive symptoms",
        "recommendation": "Consider counseling, follow-up and/or pharmacotherapy"
      },
      {
        "min": 15,
        "max": 19,
        "level": "moderate_severe",
        "label": "Moderately Severe Depression",
        "description": "Moderately severe depressive symptoms",
        "recommendation": "Active treatment with pharmacotherapy and/or psychotherapy"
      },
      {
        "min": 20,
        "max": 27,
        "level": "severe",
        "label": "Severe Depression",
        "description": "Severe depressive symptoms",
        "recommendation": "Immediate initiation of pharmacotherapy and expedited referral to mental health specialist"
      }
    ]
  }',
  5
),
(
  'gad7',
  'Generalized Anxiety Disorder-7 (GAD-7)',
  'Standard UK NHS anxiety screening tool. Assesses anxiety severity over the past 2 weeks.',
  '1.0',
  '[
    {
      "id": 1,
      "text": "Feeling nervous, anxious, or on edge",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 2,
      "text": "Not being able to stop or control worrying",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 3,
      "text": "Worrying too much about different things",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 4,
      "text": "Trouble relaxing",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 5,
      "text": "Being so restless that it is hard to sit still",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 6,
      "text": "Becoming easily annoyed or irritable",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    },
    {
      "id": 7,
      "text": "Feeling afraid, as if something awful might happen",
      "options": ["Not at all", "Several days", "More than half the days", "Nearly every day"],
      "values": [0, 1, 2, 3]
    }
  ]',
  '{
    "scoring_method": "sum",
    "total_score": true
  }',
  '{
    "ranges": [
      {
        "min": 0,
        "max": 4,
        "level": "minimal",
        "label": "Minimal Anxiety",
        "description": "Typical anxiety levels",
        "recommendation": "No intervention needed"
      },
      {
        "min": 5,
        "max": 9,
        "level": "mild",
        "label": "Mild Anxiety",
        "description": "Noticeable anxiety symptoms",
        "recommendation": "Watchful waiting; repeat GAD-7 at follow-up"
      },
      {
        "min": 10,
        "max": 14,
        "level": "moderate",
        "label": "Moderate Anxiety",
        "description": "Clinically significant anxiety",
        "recommendation": "Consider counseling and/or pharmacotherapy"
      },
      {
        "min": 15,
        "max": 21,
        "level": "severe",
        "label": "Severe Anxiety",
        "description": "Severe anxiety symptoms",
        "recommendation": "Active treatment with pharmacotherapy and/or psychotherapy"
      }
    ]
  }',
  3
);

-- Function to clean up expired assessment progress
CREATE OR REPLACE FUNCTION cleanup_expired_assessment_progress()
RETURNS void AS $$
BEGIN
  DELETE FROM assessment_progress
  WHERE expires_at < TIMEZONE('utc', NOW());
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up expired progress (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-assessment-progress', '0 2 * * *', 'SELECT cleanup_expired_assessment_progress();');