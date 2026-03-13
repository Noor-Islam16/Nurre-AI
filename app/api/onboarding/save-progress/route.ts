import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface SaveProgressRequest {
  responses: Array<{
    questionNumber: number;
    response: any;
  }>;
  currentSection?: number;
}

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

    const body: SaveProgressRequest = await request.json();
    const { responses } = body;

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: "Invalid data format" },
        { status: 400 },
      );
    }

    // Only persist Q1–20 to onboarding_responses (DB constraint: question_number 1–20)
    // Q21–30 (Section E personalisation) are saved to users.personalisation_profile on final submit
    const scoringResponses = responses.filter((r) => r.questionNumber <= 20);

    // Delete existing progress
    await supabase.from("onboarding_responses").delete().eq("user_id", user.id);

    if (scoringResponses.length > 0) {
      const responseRecords = scoringResponses.map((r) => ({
        user_id: user.id,
        question_number: r.questionNumber,
        response:
          typeof r.response === "object"
            ? JSON.stringify(r.response)
            : String(r.response),
      }));

      const { error } = await supabase
        .from("onboarding_responses")
        .insert(responseRecords);

      if (error) {
        console.error("Error saving progress:", error);
        return NextResponse.json(
          { error: "Failed to save progress" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      savedCount: scoringResponses.length,
      message: "Progress saved successfully",
    });
  } catch (error) {
    console.error("Error saving progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch saved Q1–20 progress
    const { data: responses, error } = await supabase
      .from("onboarding_responses")
      .select("question_number, response")
      .eq("user_id", user.id)
      .order("question_number", { ascending: true });

    if (error) {
      console.error("Error fetching progress:", error);
      return NextResponse.json(
        { error: "Failed to fetch progress" },
        { status: 500 },
      );
    }

    // Transform to expected format
    const formData: Record<number, any> = {};
    responses?.forEach((r) => {
      try {
        const parsed = JSON.parse(r.response);
        formData[r.question_number] = parsed;
      } catch {
        const numValue = Number(r.response);
        formData[r.question_number] =
          !isNaN(numValue) && r.response.trim() === numValue.toString()
            ? numValue
            : r.response;
      }
    });

    // Section detection updated for 30-question structure:
    // A: Q1–3, B: Q4–15, C: Q16, D: Q17–20, E: Q21–30
    let currentSection = 0;
    if (responses && responses.length > 0) {
      const lastQuestion = Math.max(...responses.map((r) => r.question_number));
      if (lastQuestion >= 17)
        currentSection = 3; // Section D (17–20)
      else if (lastQuestion === 16)
        currentSection = 2; // Section C (16)
      else if (lastQuestion >= 4)
        currentSection = 1; // Section B (4–15)
      else currentSection = 0; // Section A (1–3)
      // Note: Section E (Q21–30) progress is not persisted between sessions
      // but will be re-answered as it comes after the saved Q1–20 range
    }

    return NextResponse.json({
      success: true,
      formData,
      currentSection,
      savedCount: responses?.length || 0,
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("onboarding_responses")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error clearing progress:", error);
      return NextResponse.json(
        { error: "Failed to clear progress" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Progress cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
