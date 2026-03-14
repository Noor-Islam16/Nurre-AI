import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  scoreAssessment,
  validateResponses,
} from "@/lib/assessment/onboarding-scoring";
import type { OnboardingResponse } from "@/lib/assessment/onboarding-scoring";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { responses, results } = body;

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: "Invalid responses format" },
        { status: 400 },
      );
    }

    if (!validateResponses(responses)) {
      return NextResponse.json(
        { error: "Please answer all questions" },
        { status: 400 },
      );
    }

    const scoringResult =
      results || scoreAssessment(responses as OnboardingResponse[]);

    // Delete old responses — return on failure to avoid unique constraint violation on insert
    const { error: deleteError } = await supabase
      .from("onboarding_responses")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error(
        "Error deleting old responses:",
        JSON.stringify(deleteError, null, 2),
      );
      return NextResponse.json(
        {
          error: "Failed to clear previous responses",
          detail: deleteError.message,
        },
        { status: 500 },
      );
    }

    // Only save Q1–20 (DSM-5 scoring questions) to onboarding_responses
    const scoringResponses = (responses as OnboardingResponse[]).filter(
      (r) => r.questionNumber >= 1 && r.questionNumber <= 20,
    );

    if (scoringResponses.length > 0) {
      const responseRecords = scoringResponses.map((r) => ({
        user_id: user.id,
        question_number: r.questionNumber,
        response:
          typeof r.response === "object"
            ? JSON.stringify(r.response)
            : String(r.response),
      }));

      const { error: responseError } = await supabase
        .from("onboarding_responses")
        .insert(responseRecords);

      if (responseError) {
        console.error(
          "Error saving responses:",
          JSON.stringify(responseError, null, 2),
        );
        return NextResponse.json(
          {
            error: "Failed to save responses",
            detail: responseError.message,
            code: responseError.code,
          },
          { status: 500 },
        );
      }
    }

    // Build personalisation profile from Q21–30
    const personalisationResponses = (responses as OnboardingResponse[]).filter(
      (r) => r.questionNumber >= 21,
    );
    const personalisationKeyMap: Record<number, string> = {
      21: "task_type",
      22: "peak_focus_time",
      23: "first_distraction_trigger",
      24: "phone_app_trigger",
      25: "adhd_pattern",
      26: "motivation_style",
      27: "regulation_strategy",
      28: "avatar_tone",
      29: "work_environment",
      30: "sensory_focus_preference",
    };
    const personalisationProfile: Record<string, any> = {};
    personalisationResponses.forEach((r) => {
      const key = personalisationKeyMap[r.questionNumber];
      if (key) personalisationProfile[key] = r.response;
    });

    const { error: resultsError } = await supabase
      .from("onboarding_results")
      .upsert(
        {
          user_id: user.id,
          inatt_endorsed: scoringResult.counts.inattEndorsed,
          hyper_endorsed: scoringResult.counts.hyperEndorsed,
          total_endorsed: scoringResult.counts.totalEndorsed,
          inatt_severity: scoringResult.severity.inatt,
          hyper_severity: scoringResult.severity.hyper,
          adhd_presentation: scoringResult.screen,
          onset_childhood: scoringResult.gates.onsetChildhood,
          impairment: scoringResult.gates.impairment,
          top_signals: scoringResult.routing.topSignals,
          assessment_version: 2,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (resultsError) {
      console.error(
        "Error saving results:",
        JSON.stringify(resultsError, null, 2),
      );
      return NextResponse.json(
        {
          error: "Failed to save results",
          detail: resultsError.message,
          code: resultsError.code,
        },
        { status: 500 },
      );
    }

    const { error: profileError } = await supabase
      .from("users")
      .update({
        adhd_presentation: scoringResult.screen,
        inatt_severity: scoringResult.severity.inatt,
        hyper_severity: scoringResult.severity.hyper,
        onboarding_version: 2,
        onboarding_completed: true,
        personalisation_profile: personalisationProfile,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (profileError) {
      console.error(
        "Error updating profile:",
        JSON.stringify(profileError, null, 2),
      );
      // Non-fatal — don't block the response
    }

    const startTime = request.headers.get("X-Start-Time");
    await supabase.from("events").insert({
      user_id: user.id,
      type: "onboarding_completed",
      data: {
        version: 2,
        presentation: scoringResult.screen,
        severity: {
          inatt: scoringResult.severity.inatt,
          hyper: scoringResult.severity.hyper,
        },
        duration: startTime ? Date.now() - parseInt(startTime) : null,
      },
    });

    return NextResponse.json({
      success: true,
      results: scoringResult,
      message: "Assessment completed successfully",
    });
  } catch (error) {
    console.error("Error in onboarding submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
