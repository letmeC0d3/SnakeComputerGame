"use client";

import React, { useState, useEffect } from "react";
import { Clock, Play, Trophy } from "lucide-react";

import { safeLocalStorage } from "@/utils/safeStorage";

interface DailyChallengePanelProps {
  onPlayDaily: () => void;
  refreshTrigger?: number;
}

export default function DailyChallengePanel({ onPlayDaily, refreshTrigger = 0 }: DailyChallengePanelProps) {
  const [dailyBest, setDailyBest] = useState<number>(0);
  const [userBest, setUserBest] = useState<number>(0);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [todayStr, setTodayStr] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setTodayStr(today);

    // Fetch user's local best for today
    const localBestKey = `snake_daily_score_${today}`;
    const savedLocalBest = parseInt(safeLocalStorage.getItem(localBestKey) || "0", 10);
    setUserBest(savedLocalBest);

    const fetchDailyStats = async () => {
      try {
        const res = await fetch(`/api/scores?mode=daily&challenge_date=${today}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const scores = data.scores || [];

        // Set global daily high score
        if (scores.length > 0) {
          setDailyBest(scores[0].score);
        } else {
          setDailyBest(0);
        }

        // Check if current user is on today's leaderboard
        const clientId = safeLocalStorage.getItem("snake_client_id");
        if (clientId && scores.length > 0) {
          const userIdx = scores.findIndex((s: any) => s.client_id === clientId);
          if (userIdx !== -1) {
            setUserRank(userIdx + 1);
          } else {
            setUserRank(null);
          }
        } else {
          setUserRank(null);
        }
      } catch (err) {
        console.error("Error fetching daily stats:", err);
      }
    };

    fetchDailyStats();
  }, [refreshTrigger]);

  return (
    <div className="w-full bg-[#111827] border border-gray-800 rounded-lg p-5 font-mono">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <Clock size={15} className="text-arcade-cyan animate-pulse" />
          <h3 className="font-arcade text-xs text-white uppercase tracking-wider">
            Today's Challenge
          </h3>
        </div>
        <span className="text-[10px] text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-gray-800 font-mono">
          {todayStr}
        </span>
      </div>

      <p className="text-xs text-slate-400 mb-4 font-sans leading-relaxed">
        Every player receives the exact same starting position, direction, speed, and deterministic food coordinate sequence today.
      </p>

      {/* Stats display columns */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-mono">
        <div className="bg-black/35 border border-gray-800/80 p-3 rounded text-center">
          <div className="text-[9px] text-slate-500 uppercase mb-1 font-bold">Today's Best</div>
          <div className="font-arcade text-arcade-yellow text-xs glow-text-cyan">
            {dailyBest > 0 ? dailyBest.toLocaleString() : "---"}
          </div>
        </div>
        
        <div className="bg-black/35 border border-gray-800/80 p-3 rounded text-center">
          <div className="text-[9px] text-slate-500 uppercase mb-1 font-bold">Your Score</div>
          <div className="font-arcade text-arcade-green text-xs glow-text-green">
            {userBest > 0 ? userBest.toLocaleString() : "---"}
          </div>
        </div>
      </div>

      {/* Rank Indicator */}
      {userBest > 0 && (
        <div className="mb-4 text-center border border-arcade-cyan/35 bg-arcade-cyan/5 py-2.5 rounded text-xs font-mono">
          <span className="text-slate-400">YOUR RANK: </span>
          <strong className="text-arcade-cyan font-bold font-mono">
            {userRank !== null ? `#${userRank}` : "NOT IN TOP 25"}
          </strong>
        </div>
      )}

      {/* CTA Button */}
      <button
        onClick={onPlayDaily}
        className="w-full py-3.5 bg-arcade-cyan hover:bg-cyan-400 text-black font-arcade text-[10px] rounded transition duration-200 uppercase tracking-widest glow-cyan font-bold flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
      >
        <Play size={10} fill="black" />
        PLAY DAILY CHALLENGE
      </button>
    </div>
  );
}
