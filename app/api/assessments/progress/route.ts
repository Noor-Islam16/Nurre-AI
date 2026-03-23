// app / api / assessments / progress / route.ts;
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assessment_id = searchParams.get("assessment_id");

    if (!assessment_id) {
      return NextResponse.json(
        { error: "Assessment ID required" },
        { status: 400 },
      );
    }

    // Get progress for this assessment
    const { data: progress, error } = await supabase
      .from("assessment_progress")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("assessment_id", assessment_id)
      .single();

    if (error && error.code !== "PGRST116") {
      // Not found is ok
      console.error("Error fetching progress:", error);
      return NextResponse.json(
        { error: "Failed to fetch progress" },
        { status: 500 },
      );
    }

    return NextResponse.json({ progress: progress || null });
  } catch (error) {
    console.error("Error in GET /api/assessments/progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { assessment_id, current_question_index, responses } = body;

    if (
      !assessment_id ||
      typeof current_question_index !== "number" ||
      !responses
    ) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 },
      );
    }

    // Upsert progress
    const { data: progress, error } = await supabase
      .from("assessment_progress")
      .upsert(
        {
          user_id: session.user.id,
          assessment_id,
          current_question_index,
          responses,
          last_updated: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days
        },
        {
          onConflict: "user_id,assessment_id",
        },
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving progress:", error);
      return NextResponse.json(
        { error: "Failed to save progress" },
        { status: 500 },
      );
    }

    return NextResponse.json({ progress });
  } catch (error) {
    console.error("Error in POST /api/assessments/progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assessment_id = searchParams.get("assessment_id");

    if (!assessment_id) {
      return NextResponse.json(
        { error: "Assessment ID required" },
        { status: 400 },
      );
    }

    // Delete progress
    const { error } = await supabase
      .from("assessment_progress")
      .delete()
      .eq("user_id", session.user.id)
      .eq("assessment_id", assessment_id);

    if (error) {
      console.error("Error deleting progress:", error);
      return NextResponse.json(
        { error: "Failed to delete progress" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/assessments/progress:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
