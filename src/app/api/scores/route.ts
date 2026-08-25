import { NextRequest, NextResponse } from "next/server";
import { supabase, hasSupabaseCreds } from "@/lib/supabase";
import { MAX_SUBMITTABLE_SCORE } from "@/utils/gameRules";

// In-memory rate limiting map for basic spam deterrence
const rateLimitMap = new Map<string, number>();

import { mockScores, mockDailyScores, addMockScore, ScoreEntry } from "@/utils/mockDb";

const todayStr = new Date().toISOString().split("T")[0];

// Helper to clean rateLimitMap to avoid memory bloat
const cleanRateLimits = (now: number) => {
  if (rateLimitMap.size > 1000) {
    for (const [key, timestamp] of rateLimitMap.entries()) {
      if (now - timestamp > 60000) {
        rateLimitMap.delete(key);
      }
    }
  }
};

/**
 * GET /api/scores
 * Query parameters:
 *  - mode: 'classic' | 'daily' (required)
 *  - challenge_date: 'YYYY-MM-DD' (required if mode is 'daily')
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const challengeDate = searchParams.get("challenge_date");

  if (!mode || (mode !== "classic" && mode !== "daily")) {
    return NextResponse.json({ error: "Invalid or missing game mode." }, { status: 400 });
  }

  if (mode === "daily" && !challengeDate) {
    return NextResponse.json({ error: "Missing challenge_date parameter for daily challenge." }, { status: 400 });
  }

  // Fallback check
  if (!hasSupabaseCreds || !supabase) {
    if (process.env.NODE_ENV !== "development") {
      console.error(
        "Supabase credentials check failed. Missing variables: " +
        `NEXT_PUBLIC_SUPABASE_URL: ${!process.env.NEXT_PUBLIC_SUPABASE_URL ? 'MISSING' : 'OK'}, ` +
        `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'MISSING' : 'OK'}, ` +
        `SUPABASE_SERVICE_ROLE_KEY: ${!process.env.SUPABASE_SERVICE_ROLE_KEY ? 'MISSING' : 'OK'}`
      );
      return NextResponse.json(
        { error: "Leaderboard database is currently unavailable." },
        { status: 503 }
      );
    }
    // Return DEV mock data
    const list = mode === "classic" 
      ? [...mockScores].sort((a, b) => b.score - a.score).slice(0, 25)
      : [...mockDailyScores].filter(s => s.challenge_date === challengeDate).sort((a, b) => b.score - a.score).slice(0, 25);
    return NextResponse.json(
      { scores: list },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      }
    );
  }

  try {
    let query = supabase
      .from("game_scores")
      .select("id, game_session_id, client_id, display_name, score, game_mode, challenge_date, duration_ms, created_at")
      .eq("game_mode", mode)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true }) // Tie-breaker: first to get the score ranks higher
      .limit(25);

    if (mode === "daily" && challengeDate) {
      query = query.eq("challenge_date", challengeDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database query error:", error);
      return NextResponse.json({ error: "Failed to retrieve leaderboard scores." }, { status: 500 });
    }

    return NextResponse.json(
      { scores: data || [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "An unexpected server error occurred." }, { status: 500 });
  }
}

/**
 * POST /api/scores
 * Payload fields:
 *  - game_session_id (UUID string)
 *  - client_id (UUID string)
 *  - display_name (string)
 *  - score (integer)
 *  - game_mode ('classic' | 'daily')
 *  - challenge_date ('YYYY-MM-DD' or null)
 *  - duration_ms (integer)
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "anonymous";
  const now = Date.now();

  // Basic sliding-window rate limiting (2-second limit per IP)
  cleanRateLimits(now);
  const lastRequest = rateLimitMap.get(ip);
  if (lastRequest && now - lastRequest < 2000) {
    return NextResponse.json({ error: "Submitting too fast. Please wait 2 seconds." }, { status: 429 });
  }
  rateLimitMap.set(ip, now);

  try {
    const body = await request.json();
    const { game_session_id, client_id, display_name, score, game_mode, challenge_date, duration_ms } = body;

    // --- Server-Side Anti-Cheat & Input Validations ---
    
    // 1. Basic type checks
    if (!game_session_id || !display_name || score === undefined || !game_mode) {
      return NextResponse.json({ error: "Invalid payload: missing parameters." }, { status: 400 });
    }

    if (typeof score !== "number" || !Number.isInteger(score) || score < 0) {
      return NextResponse.json({ error: "Score must be a positive integer." }, { status: 400 });
    }

    if (typeof duration_ms !== "number" || duration_ms <= 0) {
      return NextResponse.json({ error: "Invalid game duration." }, { status: 400 });
    }

    if (game_mode !== "classic" && game_mode !== "daily") {
      return NextResponse.json({ error: "Invalid game mode." }, { status: 400 });
    }

    // 2. Reasonable threshold checks
    if (score > MAX_SUBMITTABLE_SCORE) {
      return NextResponse.json({ error: "Score exceeds maximum allowed threshold." }, { status: 400 });
    }

    // Reject obviously impossible values (e.g. score greater than zero in a 50ms total run)
    if (score > 0 && duration_ms < 100) {
      return NextResponse.json({ error: "Game duration is too short for this score." }, { status: 400 });
    }

    if (game_mode === "daily") {
      if (!challenge_date || !/^\d{4}-\d{2}-\d{2}$/.test(challenge_date)) {
        return NextResponse.json({ error: "Invalid challenge date format YYYY-MM-DD." }, { status: 400 });
      }
      
      // Verify dates are not far in the future
      const parsedDate = new Date(challenge_date);
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      if (parsedDate.getTime() > tomorrow.getTime()) {
        return NextResponse.json({ error: "Cannot submit scores for future challenges." }, { status: 400 });
      }
    }

    // 3. Sanitize display name
    // Trim, strip HTML, limit to 20 chars
    let sanitizedName = display_name
      .replace(/<[^>]*>/g, "") // Strip HTML tags
      .replace(/[^\w\s#\-@]/g, "") // Keep alphanumeric, spaces, hashes, hyphens, and at-symbols
      .trim()
      .substring(0, 20);

    if (!sanitizedName) {
      sanitizedName = "Player#" + Math.floor(1000 + Math.random() * 9000);
    }

    // MVP anti-cheat is deterrence, not cryptographic verification. 
    // If competitive leaderboards become valuable, implement server-verifiable 
    // game state/replay validation in a later version.

    // Check DB availability and execute insertion or mock insertion
    if (!hasSupabaseCreds || !supabase) {
      if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
          { error: "Leaderboard database is currently unavailable." },
          { status: 503 }
        );
      }

      // Check duplicates in dev in-memory database
      const isDuplicate = game_mode === "classic"
        ? mockScores.some(s => s.game_session_id === game_session_id)
        : mockDailyScores.some(s => s.game_session_id === game_session_id);

      if (isDuplicate) {
        return NextResponse.json({ error: "Duplicate submission. Game session already submitted." }, { status: 400 });
      }

      // Dev mock insert
      const newScore: ScoreEntry = {
        id: Math.random().toString(36).substring(2, 9),
        game_session_id,
        client_id: client_id || "anonymous",
        display_name: sanitizedName,
        score,
        game_mode,
        challenge_date: game_mode === "daily" ? challenge_date : null,
        duration_ms,
        created_at: new Date().toISOString()
      };

      addMockScore(newScore);

      return NextResponse.json({ success: true, score: newScore });
    }

    // Check for duplicate game_session_id in database
    const { data: existing, error: checkError } = await supabase
      .from("game_scores")
      .select("id")
      .eq("game_session_id", game_session_id)
      .maybeSingle();

    if (checkError) {
      console.error("Duplicate check error:", checkError);
      return NextResponse.json({ error: "Failed to verify session uniqueness." }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: "Duplicate submission. Game session already submitted." }, { status: 400 });
    }

    // Insert score
    const { data: inserted, error: insertError } = await supabase
      .from("game_scores")
      .insert({
        game_session_id,
        client_id: client_id || null,
        display_name: sanitizedName,
        score,
        game_mode,
        challenge_date: game_mode === "daily" ? challenge_date : null,
        duration_ms,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json({ error: "Failed to persist score." }, { status: 500 });
    }

    return NextResponse.json({ success: true, score: inserted });
  } catch (err) {
    console.error("Submission error:", err);
    return NextResponse.json({ error: "Invalid JSON or server error." }, { status: 400 });
  }
}
