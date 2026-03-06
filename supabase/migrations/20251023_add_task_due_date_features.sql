-- Migration: Add task due date features (recurring tasks and priority override)
-- Date: 2025-10-23
-- Description: Adds support for recurring tasks and manual priority overrides
-- Status: COMPLETED


-- Add recurring_pattern column for recurring task definitions
-- Format: { "type": "daily" | "weekly" | "monthly", "interval": 1, "endDate": "ISO date" }
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS recurring_pattern JSONB DEFAULT NULL;

-- Add priority_override flag to track manual priority changes
-- When true, automatic priority calculation based on due date is disabled
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority_override BOOLEAN DEFAULT FALSE;

-- Create index for recurring tasks (for efficient queries)
CREATE INDEX IF NOT EXISTS idx_tasks_recurring
ON tasks (recurring_pattern)
WHERE recurring_pattern IS NOT NULL;

-- Create index for priority override (for filtering auto-calculation eligible tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_priority_override
ON tasks (priority_override, due_date)
WHERE priority_override = FALSE AND due_date IS NOT NULL;

-- Add comment to recurring_pattern column
COMMENT ON COLUMN tasks.recurring_pattern IS 'JSONB object defining recurring task pattern: {"type": "daily"|"weekly"|"monthly", "interval": number, "endDate": "ISO date"}';

-- Add comment to priority_override column
COMMENT ON COLUMN tasks.priority_override IS 'When TRUE, prevents automatic priority calculation based on due date. Set when user manually changes priority.';
