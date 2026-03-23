// app/api/assessments/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: assessments, error } = await supabase
      .from("assessments")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching assessments:", error);
      return NextResponse.json(
        { error: "Failed to fetch assessments" },
        { status: 500 },
      );
    }

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error in GET /api/assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assessment_id, responses, time_taken } = body;

    if (!assessment_id || !responses || typeof time_taken !== "number") {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 },
      );
    }

    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("*")
      .eq("id", assessment_id)
      .single();

    if (assessmentError || !assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    const scores = calculateScores(assessment, responses);
    const severity_level = getSeverityLevel(assessment, scores);

    const { data: response, error: responseError } = await supabase
      .from("assessment_responses")
      .insert({
        user_id: session.user.id,
        assessment_id,
        assessment_type: assessment.type,
        responses,
        scores,
        severity_level,
        time_taken,
        started_at: new Date(Date.now() - time_taken * 1000).toISOString(),
        completed_at: new Date().toISOString(),
        is_complete: true,
      })
      .select()
      .single();

    if (responseError) {
      console.error("Error saving assessment response:", responseError);
      return NextResponse.json(
        { error: "Failed to save assessment" },
        { status: 500 },
      );
    }

    await supabase
      .from("assessment_progress")
      .delete()
      .eq("user_id", session.user.id)
      .eq("assessment_id", assessment_id);

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error in POST /api/assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// calculateScores
//
// Mirrors the logic in assessment-service.ts — kept in sync with the same
// three strategies:
//   1. asrs_threshold   → count positive Part-A answers, no raw total
//   2. dass21_subscale  → raw subscale sums × 2 (official Lovibond rule)
//   3. sum (default)    → simple total
// ─────────────────────────────────────────────────────────────────────────────
function calculateScores(
  assessment: any,
  responses: Record<number, number>,
): Record<string, any> {
  const { scoring_rules } = assessment;
  const scores: Record<string, any> = {};

  // ── ASRS threshold scoring ────────────────────────────────────────────────
  if (scoring_rules.scoring_method === "asrs_threshold") {
    const sectionA = scoring_rules.sections?.["A"];
    if (sectionA) {
      const thresholds = sectionA.thresholds ?? {
        q1_q3_min: 2,
        q4_q6_min: 3,
        positive_required: 4,
      };

      const partAQuestions: number[] = sectionA.questions; // [1,2,3,4,5,6]
      let positiveCount = 0;

      partAQuestions.forEach((qId: number, idx: number) => {
        const value = responses[qId] ?? 0;
        const min = idx < 3 ? thresholds.q1_q3_min : thresholds.q4_q6_min;
        if (value >= min) positiveCount++;
      });

      const partBQuestions: number[] =
        scoring_rules.sections?.["B"]?.questions ?? [];
      const partBSum = partBQuestions.reduce(
        (sum: number, qId: number) => sum + (responses[qId] ?? 0),
        0,
      );

      scores.sections = { A: positiveCount, B: partBSum };
      scores.total = positiveCount; // drives interpretation range lookup
    }
    return scores;
  }

  // ── DASS-21 subscale scoring (×2 multiplier) ──────────────────────────────
  if (scoring_rules.scoring_method === "dass21_subscale") {
    scores.subscales = {};
    let combinedTotal = 0;

    if (scoring_rules.subscales) {
      for (const [name, subscale] of Object.entries(
        scoring_rules.subscales as Record<string, any>,
      )) {
        const rawSum: number = subscale.questions.reduce(
          (sum: number, qId: number) => sum + (responses[qId] ?? 0),
          0,
        );
        const multiplier: number = subscale.multiplier ?? 2;
        const scaledScore = rawSum * multiplier;
        scores.subscales[name] = scaledScore;
        combinedTotal += scaledScore;
      }
    }

    scores.total = combinedTotal;
    return scores;
  }

  // ── Default: simple sum ───────────────────────────────────────────────────
  if (scoring_rules.total_score !== false) {
    scores.total = Object.values(responses).reduce(
      (sum: number, value: any) => sum + value,
      0,
    );
  }

  if (scoring_rules.sections) {
    scores.sections = {};
    for (const [sectionName, section] of Object.entries(
      scoring_rules.sections as Record<string, any>,
    )) {
      scores.sections[sectionName] = section.questions.reduce(
        (sum: number, qId: number) => sum + (responses[qId] ?? 0),
        0,
      );
    }
  }

  if (scoring_rules.subscales) {
    scores.subscales = {};
    for (const [subscaleName, subscale] of Object.entries(
      scoring_rules.subscales as Record<string, any>,
    )) {
      scores.subscales[subscaleName] = subscale.questions.reduce(
        (sum: number, qId: number) => sum + (responses[qId] ?? 0),
        0,
      );
    }
  }

  return scores;
}

// ─────────────────────────────────────────────────────────────────────────────
// getSeverityLevel
//
// Uses scores.total for range lookup — which for ASRS is the positive-answer
// count and for DASS-21 is the combined doubled subscale total.
// ─────────────────────────────────────────────────────────────────────────────
function getSeverityLevel(
  assessment: any,
  scores: Record<string, any>,
): string {
  const { ranges } = assessment.interpretation_guide;
  const total: number = scores.total ?? 0;

  for (const range of ranges) {
    if (total >= range.min && total <= range.max) {
      return range.level;
    }
  }

  return ranges[0].level;
}
