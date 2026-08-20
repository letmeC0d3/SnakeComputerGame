import { NextRequest, NextResponse } from "next/server";
import { supabase, hasSupabaseCreds } from "@/lib/supabase";
import { mockScores, mockDailyScores } from "@/utils/mockDb";

/**
 * GET /api/scores/[id]
 * Retrieves score details for a specific record.
 * Supports querying by numeric serial ID or game_session_id (UUID).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "Missing score identifier." }, { status: 400 });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const isNumeric = /^\d+$/.test(id);

  // Fallback checks for local development mock data
  if (!hasSupabaseCreds || !supabase) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "Leaderboard database is currently unavailable." },
        { status: 503 }
      );
    }

    // Lookup in mock database
    const mockScore = [...mockScores, ...mockDailyScores].find(
      (s) => s.id === id || s.game_session_id === id
    );

    if (!mockScore) {
      return NextResponse.json({ error: "Score record not found in mock database." }, { status: 404 });
    }

    return NextResponse.json({ score: mockScore });
  }

  try {
    let query = supabase
      .from("game_scores")
      .select("id, game_session_id, client_id, display_name, score, game_mode, challenge_date, duration_ms, created_at");

    if (isNumeric) {
      query = query.eq("id", parseInt(id, 10));
    } else if (isUuid) {
      query = query.eq("game_session_id", id);
    } else {
      return NextResponse.json({ error: "Invalid identifier format." }, { status: 400 });
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error("Database score fetch error:", error);
      return NextResponse.json({ error: "Failed to retrieve score details." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Score record not found." }, { status: 404 });
    }

    return NextResponse.json({ score: data });
  } catch (err) {
    console.error("API error fetching score details:", err);
    return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
  }
}
