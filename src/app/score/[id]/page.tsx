import React from "react";
import type { Metadata } from "next";
import { supabase, hasSupabaseCreds } from "@/lib/supabase";
import { mockScores, mockDailyScores } from "@/utils/mockDb";
import { Gamepad2, Award, Calendar, Share2, ChevronRight, Trophy } from "lucide-react";

interface RouteParams {
  id: string;
}

// Internal helper to fetch score data on the server
async function getScoreData(id: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const isNumeric = /^\d+$/.test(id);

  if (!hasSupabaseCreds || !supabase) {
    // Development Mock Database Lookup
    return (
      [...mockScores, ...mockDailyScores].find(
        (s) => s.id === id || s.game_session_id === id
      ) || null
    );
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
      return null;
    }

    const { data } = await query.maybeSingle();
    return data;
  } catch (err) {
    console.error("Server score query error:", err);
    return null;
  }
}

// Generate dynamic metadata for Open Graph crawling previews
export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const scoreData = await getScoreData(id);

  if (!scoreData) {
    return {
      title: "Snake Game Score - SnakeComputerGame.com",
      description: "Play classic Snake online instantly. Compete for the daily high score.",
    };
  }

  const scoreText = scoreData.score.toLocaleString();
  const nameText = scoreData.display_name;
  const modeText = scoreData.game_mode === "daily" ? "Daily Challenge" : "Classic Mode";

  return {
    title: `🐍 ${nameText} scored ${scoreText} on Snake!`,
    description: `Can you beat ${nameText}'s score of ${scoreText} in Snake ${modeText}? Play classic Snake online free, no downloads required.`,
    openGraph: {
      title: `🐍 ${nameText} scored ${scoreText} on Snake!`,
      description: `Can you beat this score? Play classic Snake online. Compete on leaderboards and beat daily seeds.`,
      url: `https://snakecomputergame.com/score/${id}`,
      type: "website",
      siteName: "SnakeComputerGame.com",
    },
    twitter: {
      card: "summary_large_image",
      title: `🐍 ${nameText} scored ${scoreText} on Snake!`,
      description: `Can you beat this score? Play classic Snake online free, no downloads required.`,
    },
  };
}

export default async function ScorePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  const scoreData = await getScoreData(id);

  if (!scoreData) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center p-6 font-mono bg-[#0b0f19]">
        <span className="text-arcade-pink text-4xl mb-4 font-arcade">404</span>
        <h1 className="text-white text-lg font-arcade tracking-wider uppercase mb-2">Score Not Found</h1>
        <p className="text-xs text-slate-500 mb-6">This score entry might have expired or does not exist.</p>
        <a
          href="/"
          className="px-6 py-2.5 bg-arcade-green text-black font-arcade text-[10px] tracking-wider rounded glow-green cursor-pointer uppercase"
        >
          Go to Game
        </a>
      </div>
    );
  }

  const durationSec = scoreData.duration_ms
    ? Math.floor(scoreData.duration_ms / 1000)
    : 0;

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-10 px-4 bg-[#0b0f19]">
      
      {/* Retro Arcade score box */}
      <div className="w-full max-w-sm bg-[#111827] border border-gray-800 rounded-lg p-6 font-mono text-center shadow-2xl relative overflow-hidden scanlines">
        
        {/* Neon accent glows */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-arcade-green via-arcade-cyan to-arcade-pink"></div>

        <span className="inline-block text-[10px] text-slate-500 border border-gray-800 bg-black/40 px-2.5 py-0.5 rounded uppercase tracking-wider mb-5">
          Arcade Certificate
        </span>

        <h1 className="font-arcade text-arcade-cyan text-sm tracking-widest uppercase mb-1">
          🐍 SNAKE SCORE
        </h1>
        
        {/* Large neon digital display */}
        <div className="my-6 bg-black/50 border border-gray-800 rounded py-5 px-3 glow-green">
          <div className="font-arcade text-arcade-green text-3xl sm:text-4xl tracking-widest glow-text-green font-bold">
            {scoreData.score.toLocaleString()}
          </div>
          <div className="text-[9px] text-slate-500 uppercase mt-2 font-bold font-arcade tracking-wider">
            Points Gained
          </div>
        </div>

        {/* Player specifics info */}
        <div className="space-y-3.5 text-xs text-slate-300 border-y border-gray-800/80 py-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 uppercase text-[10px] font-bold">Player:</span>
            <span className="text-white font-semibold font-mono text-sm">{scoreData.display_name}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-slate-500 uppercase text-[10px] font-bold">Game Mode:</span>
            <span className="text-arcade-cyan font-bold uppercase text-[11px] flex items-center gap-1">
              {scoreData.game_mode === "daily" ? (
                <>
                  <Calendar size={12} />
                  Daily Seed
                </>
              ) : (
                <>
                  <Gamepad2 size={12} />
                  Classic
                </>
              )}
            </span>
          </div>

          {scoreData.challenge_date && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 uppercase text-[10px] font-bold">Challenge Date:</span>
              <span className="text-slate-300 font-mono">{scoreData.challenge_date}</span>
            </div>
          )}

          {durationSec > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 uppercase text-[10px] font-bold">Game Duration:</span>
              <span className="text-slate-300 font-mono">{durationSec} Seconds</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 mb-6 font-sans">
          Think you can navigate the grid better and eat more cherries? Test your reflexes now!
        </p>

        {/* Primary CTA Play button */}
        <a
          href="/"
          className="w-full py-4 bg-arcade-green hover:bg-green-400 text-black font-arcade text-xs rounded transition duration-150 uppercase tracking-widest glow-green font-bold flex items-center justify-center gap-2 cursor-pointer transform active:scale-95 shadow-lg"
        >
          PLAY SNAKE NOW
          <ChevronRight size={13} strokeWidth={3} />
        </a>

      </div>

      {/* Decorative branding link */}
      <a href="/" className="mt-6 text-[10px] text-slate-500 hover:text-slate-300 font-mono tracking-wider transition">
        &larr; Return to SnakeComputerGame.com
      </a>

    </div>
  );
}
