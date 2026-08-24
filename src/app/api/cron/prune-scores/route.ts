import { NextRequest, NextResponse } from "next/server";
import { supabase, hasSupabaseCreds } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const isDev = process.env.NODE_ENV === "development";

  // Verify Vercel Cron authorization header
  if (!isDev && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handle fallback dev database
  if (!hasSupabaseCreds || !supabase) {
    return NextResponse.json({
      success: true,
      message: "No Supabase credentials configured. Skipped live pruning in mock mode.",
    });
  }

  try {
    // 1. Delete daily challenge scores older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

    const { error: dailyError } = await supabase
      .from("game_scores")
      .delete()
      .eq("game_mode", "daily")
      .lt("created_at", sevenDaysAgo.toISOString());

    if (dailyError) {
      console.error("Error pruning daily scores:", dailyError);
      return NextResponse.json({ error: "Failed to prune daily scores." }, { status: 500 });
    }

    // 2. Fetch the top 100 classic scores to exclude them from pruning
    const { data: topClassic, error: fetchError } = await supabase
      .from("game_scores")
      .select("id")
      .eq("game_mode", "classic")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error("Error fetching top classic scores:", fetchError);
      return NextResponse.json({ error: "Failed to fetch top classic scores." }, { status: 500 });
    }

    // 3. Delete classic scores older than 30 days that are NOT in the top 100
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

    const topIds = topClassic ? topClassic.map((s) => s.id) : [];

    let classicQuery = supabase
      .from("game_scores")
      .delete()
      .eq("game_mode", "classic")
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (topIds.length > 0) {
      classicQuery = classicQuery.not("id", "in", `(${topIds.join(",")})`);
    }

    const { error: classicError } = await classicQuery;

    if (classicError) {
      console.error("Error pruning classic scores:", classicError);
      return NextResponse.json({ error: "Failed to prune classic scores." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Scores pruned successfully.",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Unexpected error during scores pruning:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
