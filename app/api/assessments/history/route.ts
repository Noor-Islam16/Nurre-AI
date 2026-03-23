// app / api / assessments / history / route.ts;
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
    const assessment_type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") || "10");

    let query = supabase
      .from("assessment_responses")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("is_complete", true)
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (assessment_type) {
      query = query.eq("assessment_type", assessment_type);
    }

    const { data: history, error } = await query;

    if (error) {
      console.error("Error fetching assessment history:", error);
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500 },
      );
    }

    // Calculate statistics
    const stats: any = {};
    if (history && history.length > 0) {
      // Group by assessment type
      const byType = history.reduce((acc: any, response: any) => {
        if (!acc[response.assessment_type]) {
          acc[response.assessment_type] = [];
        }
        acc[response.assessment_type].push(response);
        return acc;
      }, {});

      // Calculate stats for each type
      for (const [type, responses] of Object.entries(byType)) {
        const typeResponses = responses as any[];
        const scores = typeResponses.map((r: any) => r.scores.total || 0);
        const avgScore =
          scores.reduce((a: number, b: number) => a + b, 0) / scores.length;

        // Determine trend
        let trend = "stable";
        if (typeResponses.length >= 3) {
          const recentScores = scores.slice(0, 3);
          const scoreDiff = recentScores[0] - recentScores[2];
          if (scoreDiff < -2) trend = "improving";
          else if (scoreDiff > 2) trend = "worsening";
        }

        stats[type] = {
          total_taken: typeResponses.length,
          last_taken: typeResponses[0].completed_at,
          average_score: Math.round(avgScore * 10) / 10,
          trend,
          last_severity: typeResponses[0].severity_level,
        };
      }
    }

    return NextResponse.json({ history, stats });
  } catch (error) {
    console.error("Error in GET /api/assessments/history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
