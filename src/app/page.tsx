"use client";

import React, { useState } from "react";
import SnakeGame from "@/components/SnakeGame";
import Leaderboard from "@/components/Leaderboard";
import DailyChallengePanel from "@/components/DailyChallengePanel";
import { trackEvent } from "@/utils/analytics";
import { Gamepad2, Award, Calendar, HelpCircle } from "lucide-react";

export default function Home() {
  const [gameMode, setGameMode] = useState<"classic" | "daily">("classic");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleModeChange = (mode: "classic" | "daily") => {
    setGameMode(mode);
    trackEvent("page_view", {
      game_mode: mode,
      source: "mode_selector",
    });
  };

  const handleScoreSubmitted = () => {
    // Increment to trigger reload on panels and leaderboards
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Retro Navigation Header */}
      <header className="border-b border-gray-800 bg-[#090d16]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-arcade-green font-arcade text-base tracking-tighter glow-text-green">
              🐍 SNAKE
            </span>
            <span className="hidden sm:inline text-white font-arcade text-[10px] tracking-widest text-slate-400">
              COMPUTER GAME
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <a href="#rules" className="text-slate-400 hover:text-white transition">Rules</a>
            <a href="#tips" className="text-slate-400 hover:text-white transition">Tips</a>
            <a href="/snake-game" className="text-arcade-cyan hover:text-cyan-300 font-bold transition">Play Page</a>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 md:py-10 flex flex-col gap-8">
        
        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto flex flex-col items-center">
          <h1 className="font-arcade text-xl sm:text-2xl lg:text-3xl text-white tracking-wide leading-tight mb-2.5">
            PLAY SNAKE ONLINE
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-mono tracking-wide">
            Classic Snake. Instant play. Compete for the high score.
          </p>
        </section>

        {/* Responsive Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Gameplay Screen Column */}
          <div className="lg:col-span-7 flex flex-col items-center gap-6">
            
            {/* Mode Switcher Tabs */}
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
                CLASSIC MODE
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
                DAILY CHALLENGE
              </button>
            </div>

            {/* Playable Game Canvas */}
            <div className="w-full">
              <SnakeGame mode={gameMode} onScoreSubmitted={handleScoreSubmitted} />
            </div>

          </div>

          {/* Leaderboard and stats column */}
          <div className="lg:col-span-5 flex flex-col gap-6 w-full max-w-lg mx-auto lg:max-w-none">
            {/* Daily panel card */}
            <DailyChallengePanel 
              onPlayDaily={() => handleModeChange("daily")} 
              refreshTrigger={refreshTrigger}
            />

            {/* Leaderboard card */}
            <Leaderboard refreshTrigger={refreshTrigger} />
          </div>

        </div>

        {/* SEO copy sections */}
        <hr className="border-gray-800 my-4" />

        <section id="rules" className="max-w-4xl mx-auto font-mono text-xs text-slate-400 space-y-8 leading-relaxed">
          <div>
            <h2 className="text-sm font-arcade text-arcade-cyan tracking-wider uppercase mb-3 flex items-center gap-2">
              <HelpCircle size={14} />
              About Snake Game Online
            </h2>
            <p className="font-sans mb-3 text-slate-300">
              Welcome to <strong>SnakeComputerGame.com</strong>, the ultimate online destination to play the <strong>classic snake game</strong> free with zero downloads! This version has been fully optimized to load instantly, support smooth 60fps gameplay on both desktop and mobile viewports, and allow you to compare your scores globally.
            </p>
            <p className="font-sans">
              Unlike generic offline clones, this game features a <strong>Daily Challenge</strong> where every player competes on an identical board with the exact same deterministic food generation seed. Do you have the precision, speed, and strategy required to claim the #1 rank today?
            </p>
          </div>

          <div>
            <h2 className="text-sm font-arcade text-arcade-pink tracking-wider uppercase mb-3 flex items-center gap-2">
              <Award size={14} />
              How to Play & Controls
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
              <div className="bg-[#111827] border border-gray-800 p-4 rounded text-slate-300">
                <h3 className="font-arcade text-[10px] text-arcade-yellow mb-2 uppercase">Desktop Keyboard</h3>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li><strong>Arrow Keys</strong> or <strong>WASD</strong> controls directional steering.</li>
                  <li><strong>Escape (ESC)</strong> pauses and resumes the game loop.</li>
                  <li><strong>Spacebar</strong> starts a new game or triggers a quick replay.</li>
                </ul>
              </div>
              <div className="bg-[#111827] border border-gray-800 p-4 rounded text-slate-300">
                <h3 className="font-arcade text-[10px] text-arcade-cyan mb-2 uppercase">Mobile Swipe & Tap</h3>
                <ul className="list-disc pl-4 space-y-1.5">
                  <li>Swipe in any direction inside the screen to change course.</li>
                  <li>Or use the retro <strong>onscreen directional D-pad</strong> below the game board.</li>
                  <li>Optimized to lock page scrolling for a native arcade feel.</li>
                </ul>
              </div>
            </div>
          </div>

          <div id="tips">
            <h2 className="text-sm font-arcade text-arcade-yellow tracking-wider uppercase mb-3">
              Pro Strategies to Beat the High Score
            </h2>
            <ul className="list-decimal pl-4 space-y-2 font-sans text-slate-300">
              <li>
                <strong className="text-white">Wall Riding:</strong> When the grid gets tight, navigate along the perimeter wall. This keeps the center of the board clear, giving you more space to coil the snake safely.
              </li>
              <li>
                <strong className="text-white">Coiling Technique:</strong> Snake body segments follow the path of the head. Avoid taking erratic zig-zag routes; instead, fold the snake body tightly against itself to maximize available grid space.
              </li>
              <li>
                <strong className="text-white">Plan for Speed:</strong> Eating food increases your snake length and accelerates the speed tick rate. Anticipate the next move immediately before consuming food so you aren't caught off guard.
              </li>
            </ul>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black/40 py-6 text-center text-[10px] text-slate-600 font-mono tracking-wider">
        <p>&copy; {new Date().getFullYear()} SnakeComputerGame.com. All rights reserved.</p>
        <p className="mt-1 text-slate-500">Free, instant, classic snake game online with no downloads. UTC Day resets at 00:00.</p>
      </footer>
    </div>
  );
}
