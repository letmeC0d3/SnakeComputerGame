"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Clock, RefreshCw } from "lucide-react";
import { trackEvent } from "@/utils/analytics";

import { safeLocalStorage } from "@/utils/safeStorage";

interface LeaderboardProps {
  refreshTrigger?: number;
}

export default function Leaderboard({ refreshTrigger = 0 }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<"daily" | "classic">("daily");
  const [scores, setScores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");

  // Retrieve client ID for highlight verification
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedId = safeLocalStorage.getItem("snake_client_id") || "";
      setClientId(storedId);
    }
  }, []);

  const fetchScores = async (mode: "daily" | "classic") => {
    setIsLoading(true);
    setErrorState(null);

    const todayStr = new Date().toISOString().split("T")[0];
    const url = mode === "daily"
      ? `/api/scores?mode=daily&challenge_date=${todayStr}`
      : `/api/scores?mode=classic`;

    try {
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch scores.");
      }

      setScores(data.scores || []);
    } catch (err: any) {
      console.error("Leaderboard fetch error:", err);
      setErrorState(err.message || "Leaderboard database is currently unavailable.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScores(activeTab);
    
    trackEvent("leaderboard_viewed", {
      game_mode: activeTab,
    });
  }, [activeTab, refreshTrigger]);

  return (
    <div className="w-full bg-[#111827] border border-gray-800 rounded-lg overflow-hidden font-mono">
      {/* Header Tabs */}
      <div className="flex border-b border-gray-800 bg-black/30">
        <button
          onClick={() => setActiveTab("daily")}
          className={`flex-1 py-3.5 text-xs font-arcade tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition ${
            activeTab === "daily"
              ? "text-arcade-cyan border-b-2 border-arcade-cyan bg-[#111827]"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Clock size={12} />
          Today
        </button>
        <button
          onClick={() => setActiveTab("classic")}
          className={`flex-1 py-3.5 text-xs font-arcade tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer transition ${
            activeTab === "classic"
              ? "text-arcade-yellow border-b-2 border-arcade-yellow bg-[#111827]"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          <Trophy size={12} />
          All Time
        </button>
      </div>

      {/* Leaderboard Table Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 animate-pulse uppercase tracking-widest font-arcade">
            LOADING LEADERBOARD...
          </div>
        ) : errorState ? (
          <div className="py-8 text-center text-xs px-4 border border-red-900/30 bg-red-950/10 rounded">
            <p className="text-arcade-pink font-semibold uppercase mb-1.5 font-arcade text-[10px]">
              Leaderboard temporarily unavailable.
            </p>
            <p className="text-[11px] text-slate-400 font-sans">
              Your personal high score is still saved locally.
            </p>
          </div>
        ) : scores.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 leading-relaxed uppercase">
            No high scores submitted yet.<br />
            <span className="text-arcade-green font-bold">Be the first to submit!</span>
          </div>
        ) : (
          <div className="overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-2.5 w-16">Rank</th>
                  <th className="py-2.5">Player</th>
                  <th className="py-2.5 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {scores.map((item, index) => {
                  const isCurrentUser = clientId && item.client_id === clientId;
                  return (
                    <tr
                      key={item.id || item.game_session_id}
                      className={`border-b border-gray-800/40 last:border-b-0 hover:bg-gray-800/20 transition-colors ${
                        isCurrentUser 
                          ? "bg-arcade-green/10 text-arcade-green font-semibold" 
                          : "text-slate-300"
                      }`}
                    >
                      <td className="py-3 font-bold font-mono">
                        {isCurrentUser ? "👉 " : ""}#{index + 1}
                      </td>
                      <td className="py-3 max-w-[150px] truncate font-mono">
                        {item.display_name} {isCurrentUser ? " (You)" : ""}
                      </td>
                      <td className={`py-3 text-right font-bold font-mono ${
                        index === 0 ? "text-arcade-yellow text-sm" : 
                        index === 1 ? "text-slate-100" :
                        index === 2 ? "text-amber-600" : ""
                      }`}>
                        {item.score.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Action Controls */}
        <div className="mt-4 flex justify-between items-center text-[10px] text-slate-500 border-t border-gray-800/60 pt-3">
          <span>Top 25 Entries</span>
          <button
            onClick={() => fetchScores(activeTab)}
            disabled={isLoading}
            className="flex items-center gap-1 hover:text-slate-300 transition uppercase cursor-pointer"
          >
            <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
            REFRESH
          </button>
        </div>
      </div>
    </div>
  );
}
