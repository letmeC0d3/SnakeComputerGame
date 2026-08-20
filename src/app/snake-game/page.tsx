"use client";

import React, { useState } from "react";
import SnakeGame from "@/components/SnakeGame";
import Leaderboard from "@/components/Leaderboard";
import DailyChallengePanel from "@/components/DailyChallengePanel";
import { trackEvent } from "@/utils/analytics";
import { Gamepad2, Award, Calendar, ChevronLeft, ShieldCheck } from "lucide-react";

export default function PlaySnakeOnline() {
  const [gameMode, setGameMode] = useState<"classic" | "daily">("classic");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleModeChange = (mode: "classic" | "daily") => {
    setGameMode(mode);
    trackEvent("page_view", {
      game_mode: mode,
      source: "seo_play_page",
    });
  };

  const handleScoreSubmitted = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="flex items-center gap-1 text-slate-400 hover:text-white transition text-xs font-mono">
            <ChevronLeft size={14} />
            Back to Home
          </a>
          <span className="text-arcade-green font-arcade text-base tracking-tighter glow-text-green">
            🐍 PLAY SNAKE ONLINE
          </span>
          <div className="text-[10px] text-slate-500 font-mono hidden sm:block">
            No Installation Required
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-10 flex flex-col gap-8">
        
        {/* Intro */}
        <section className="text-center max-w-2xl mx-auto flex flex-col items-center">
          <h1 className="font-arcade text-xl sm:text-2xl text-white tracking-wide leading-tight mb-2.5">
            PLAY SNAKE ONLINE FREE
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono tracking-wide">
            Experience the original classic arcade game inside your modern browser.
          </p>
        </section>

        {/* Game and Side panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-7 flex flex-col items-center gap-6">
            
            <div className="w-full max-w-lg bg-[#111827] border border-gray-800 p-1.5 rounded-lg flex font-mono text-xs select-none">
              <button
                onClick={() => handleModeChange("classic")}
                className={`flex-1 py-2 rounded font-arcade text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  gameMode === "classic"
                    ? "bg-arcade-green text-black font-bold glow-green"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Gamepad2 size={12} />
                CLASSIC PLAY
              </button>
              <button
                onClick={() => handleModeChange("daily")}
                className={`flex-1 py-2 rounded font-arcade text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  gameMode === "daily"
                    ? "bg-arcade-cyan text-black font-bold glow-cyan"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Calendar size={12} />
                DAILY SEED
              </button>
            </div>

            <div className="w-full">
              <SnakeGame mode={gameMode} onScoreSubmitted={handleScoreSubmitted} />
            </div>

          </div>

          <div className="lg:col-span-5 flex flex-col gap-6 w-full max-w-lg mx-auto lg:max-w-none">
            <DailyChallengePanel 
              onPlayDaily={() => handleModeChange("daily")} 
              refreshTrigger={refreshTrigger}
            />

            <Leaderboard refreshTrigger={refreshTrigger} />
          </div>

        </div>

        {/* SEO Editorial Content */}
        <hr className="border-gray-800 my-4" />

        <section className="max-w-4xl mx-auto font-mono text-xs text-slate-400 space-y-8 leading-relaxed">
          <div>
            <h2 className="text-sm font-arcade text-arcade-cyan tracking-wider uppercase mb-3">
              The Evolution of the Snake Arcade Game
            </h2>
            <p className="font-sans mb-3 text-slate-300">
              The history of the <strong>classic snake game</strong> stretches back to 1976 when it was first introduced as an arcade game called <em>Blockade</em>. In the decades that followed, numerous clones emerged across consoles, calculators, and home computer terminals.
            </p>
            <p className="font-sans text-slate-300">
              However, the game achieved massive global fame in 1997 when Nokia design engineer Taneli Armanto programmed it onto the <strong>Nokia 6110</strong>. Suddenly, millions of mobile phone users had access to a highly addictive, responsive pocket game. It became a defining piece of retro-gaming history.
            </p>
            <p className="font-sans">
              Our web application brings that exact nostalgic experience forward. By writing the gameplay logic onto an optimized HTML5 Canvas, we guarantee there is no input latency. Your keystrokes translate instantly to movement ticks, allowing for the precise, split-second corners required at higher speeds.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-arcade text-arcade-pink tracking-wider uppercase mb-3 flex items-center gap-2">
              <ShieldCheck size={14} />
              Fair Competitive Gameplay
            </h2>
            <p className="font-sans text-slate-300">
              Traditional snake games generate food randomly, meaning some players might get lucky placements close to the snake's head, while others get distant placements that force dangerous travel paths.
            </p>
            <p className="font-sans">
              On <strong>SnakeComputerGame.com</strong>, we eliminate luck in our <strong>Daily Challenge</strong>. When you play the daily seed, food spawns at identical coordinates on every attempt. This allows you to construct and optimize a specific path, making it a pure test of speed, route-planning, and keyboard dexterity.
            </p>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black/40 py-6 text-center text-[10px] text-slate-600 font-mono tracking-wider">
        <p>&copy; {new Date().getFullYear()} SnakeComputerGame.com. Play Snake online free, no ads, no download.</p>
      </footer>
    </div>
  );
}
