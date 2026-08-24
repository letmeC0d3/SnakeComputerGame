"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Share2, Check } from "lucide-react";
import { trackEvent } from "@/utils/analytics";
import {
  Position,
  Direction,
  GRID_SIZE,
  INITIAL_SPEED,
  MIN_SPEED,
  SPEED_DECREMENT,
  STARTING_POSITION,
  STARTING_DIRECTION,
  POINTS_PER_FOOD,
} from "@/utils/gameRules";
import { SeededRandom } from "@/utils/seededRandom";
import { getDailyChallenge } from "@/utils/dailyChallenge";
import { safeLocalStorage } from "@/utils/safeStorage";

// Helper to generate UUIDs locally
function generateUUID(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Particle effect on canvas
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

// Play synthesized 8-bit sound effects using Web Audio API
const playSound = (type: "eat" | "die") => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === "eat") {
      // High-pitched retro blip
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5 note
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5 note
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "die") {
      // Descending buzzer note
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(196, now); // G3 note
      osc.frequency.linearRampToValueAtTime(80, now + 0.4);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch (err) {
    console.warn("Audio Context playback blocked or unsupported:", err);
  }
};

interface SnakeGameProps {
  mode: "classic" | "daily";
  onScoreSubmitted?: () => void;
}

export default function SnakeGame({ mode, onScoreSubmitted }: SnakeGameProps) {
  // Game states
  const [gameState, setGameState] = useState<"idle" | "playing" | "paused" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [gameSessionId, setGameSessionId] = useState("");
  const [durationMs, setDurationMs] = useState(0);
  const [activeDirection, setActiveDirection] = useState<Direction>(STARTING_DIRECTION);
  
  // Submission states
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedScore, setSubmittedScore] = useState<any>(null);
  const [submitError, setSubmitError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [showDpad, setShowDpad] = useState(true);

  // References for the canvas game loop
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);

  // Game coordinates and settings
  const snakeRef = useRef<Position[]>([{ ...STARTING_POSITION }]);
  const directionRef = useRef<Direction>(STARTING_DIRECTION);
  const nextDirectionRef = useRef<Direction>(STARTING_DIRECTION);
  const foodRef = useRef<Position>({ x: 5, y: 5 });
  const speedRef = useRef<number>(INITIAL_SPEED);
  const particlesRef = useRef<Particle[]>([]);
  const prngRef = useRef<SeededRandom | null>(null);

  // Client Identification
  const [clientId, setClientId] = useState("");

  // Touch Swipe tracking
  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize Client ID and local high scores
  // Initialize Client ID and local high scores
  useEffect(() => {
    if (typeof window !== "undefined") {
      let storedClientId = safeLocalStorage.getItem("snake_client_id");
      if (!storedClientId) {
        storedClientId = generateUUID();
        safeLocalStorage.setItem("snake_client_id", storedClientId);
      }
      setClientId(storedClientId);

      // Load cached name if exists
      const cachedName = safeLocalStorage.getItem("snake_display_name");
      if (cachedName) {
        setDisplayName(cachedName);
      } else {
        setDisplayName(`Player#${Math.floor(1000 + Math.random() * 9000)}`);
      }

      // Load local high scores depending on the mode
      const scoreKey = mode === "daily" ? `snake_daily_score_${new Date().toISOString().split("T")[0]}` : "snake_high_score";
      const savedScore = parseInt(safeLocalStorage.getItem(scoreKey) || "0", 10);
      setHighScore(savedScore);

      // Load D-pad toggle settings
      const storedDpad = safeLocalStorage.getItem("snake_show_dpad");
      if (storedDpad !== null) {
        setShowDpad(storedDpad === "true");
      } else {
        setShowDpad(window.innerWidth < 768);
      }
    }
  }, [mode]);

  // Deterministic daily setup generator
  const getDailyPrng = useCallback(() => {
    const todayUTC = new Date().toISOString().split("T")[0];
    const challenge = getDailyChallenge(todayUTC);
    return new SeededRandom(challenge.seed);
  }, []);

  // Spawn food helper
  const spawnFood = useCallback(() => {
    const snake = snakeRef.current;
    
    if (mode === "daily" && prngRef.current) {
      const prng = prngRef.current;
      const targetX = prng.nextInt(0, GRID_SIZE.width - 1);
      const targetY = prng.nextInt(0, GRID_SIZE.height - 1);
      
      const isOccupied = (x: number, y: number) => snake.some(s => s.x === x && s.y === y);
      
      if (!isOccupied(targetX, targetY)) {
        foodRef.current = { x: targetX, y: targetY };
        return;
      }

      // If cell is occupied, search deterministically for the next available cell in grid order
      const totalCells = GRID_SIZE.width * GRID_SIZE.height;
      for (let offset = 1; offset < totalCells; offset++) {
        const nextIndex = (targetY * GRID_SIZE.width + targetX + offset) % totalCells;
        const x = nextIndex % GRID_SIZE.width;
        const y = Math.floor(nextIndex / GRID_SIZE.width);
        if (!isOccupied(x, y)) {
          foodRef.current = { x, y };
          return;
        }
      }
      foodRef.current = { x: 0, y: 0 }; // Fallback
    } else {
      // Classic Mode: Random spawning
      let newFood: Position;
      let collision = true;
      while (collision) {
        newFood = {
          x: Math.floor(Math.random() * GRID_SIZE.width),
          y: Math.floor(Math.random() * GRID_SIZE.height),
        };
        collision = snake.some((seg) => seg.x === newFood.x && seg.y === newFood.y);
        if (!collision) {
          foodRef.current = newFood;
        }
      }
    }
  }, [mode]);

  // Spawn particle effect
  const spawnParticles = (x: number, y: number, color: string) => {
    const count = 10;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Convert grid coordinates to pixel offsets for particles
    const cellSize = canvas.width / GRID_SIZE.width;
    const pixelX = x * cellSize + cellSize / 2;
    const pixelY = y * cellSize + cellSize / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      particlesRef.current.push({
        x: pixelX,
        y: pixelY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: Math.random() * 3 + 1,
        alpha: 1,
        life: 1.0,
      });
    }
  };

  // Main game tick update logic
  const updateGame = useCallback(() => {
    if (gameState !== "playing") return;

    const snake = [...snakeRef.current];
    const direction = nextDirectionRef.current;
    directionRef.current = direction; // Update current head direction
    setActiveDirection(direction);

    // Calculate new head position
    const head = { ...snake[0] };
    switch (direction) {
      case "UP": head.y -= 1; break;
      case "DOWN": head.y += 1; break;
      case "LEFT": head.x -= 1; break;
      case "RIGHT": head.x += 1; break;
    }

    // Collision Checks: Walls
    if (head.x < 0 || head.x >= GRID_SIZE.width || head.y < 0 || head.y >= GRID_SIZE.height) {
      endGame();
      return;
    }

    // Collision Checks: Own Body (excluding the tail segment which moves if not eating)
    const isEating = head.x === foodRef.current.x && head.y === foodRef.current.y;
    const bodyCollision = snake.slice(0, -1).some((seg) => seg.x === head.x && seg.y === head.y);
    if (bodyCollision) {
      endGame();
      return;
    }

    // Move Snake
    snake.unshift(head);

    if (isEating) {
      // Grow snake, add score, trigger particles
      const newScore = score + POINTS_PER_FOOD;
      setScore(newScore);
      spawnParticles(foodRef.current.x, foodRef.current.y, "#39ff14");
      playSound("eat");
      
      // Speed progression
      speedRef.current = Math.max(MIN_SPEED, speedRef.current - SPEED_DECREMENT);
      spawnFood();
    } else {
      snake.pop();
    }

    snakeRef.current = snake;
  }, [gameState, score, spawnFood, setActiveDirection]);

  // Handle Game Over
  const endGame = () => {
    setGameState("gameover");
    if (gameLoopRef.current) clearTimeout(gameLoopRef.current);

    // Trigger haptic vibration on mobile devices if supported
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.vibrate) {
      // Custom double-pulse vibration pattern for retro game feel (100ms buzz, 50ms pause, 100ms buzz)
      navigator.vibrate([100, 50, 100]);
    }

    // Trigger death sound
    playSound("die");

    const finalDuration = Date.now() - startTimeRef.current - totalPausedTimeRef.current;
    setDurationMs(finalDuration);

    // Check if new local high score
    const todayUTC = new Date().toISOString().split("T")[0];
    const scoreKey = mode === "daily" ? `snake_daily_score_${todayUTC}` : "snake_high_score";
    
    let isNewLocalBest = false;
    if (score > highScore) {
      isNewLocalBest = true;
      setHighScore(score);
      setIsNewHighScore(true);
      safeLocalStorage.setItem(scoreKey, score.toString());
      
      trackEvent("new_high_score", {
        game_session_id: gameSessionId,
        game_mode: mode,
        score,
        duration_ms: finalDuration,
        challenge_date: mode === "daily" ? todayUTC : undefined,
      });
    } else {
      setIsNewHighScore(false);
    }

    // Spawn final death particle explosion on head
    const head = snakeRef.current[0];
    if (head) {
      spawnParticles(head.x, head.y, "#ff007f");
    }

    trackEvent("game_completed", {
      game_session_id: gameSessionId,
      game_mode: mode,
      score,
      duration_ms: finalDuration,
      challenge_date: mode === "daily" ? todayUTC : undefined,
    });

    if (mode === "daily") {
      trackEvent("daily_challenge_completed", {
        game_session_id: gameSessionId,
        score,
        duration_ms: finalDuration,
        challenge_date: todayUTC,
      });
    }
  };

  // Start/Restart Game Loop Setup
  const startGame = () => {
    const newSessionId = generateUUID();
    setGameSessionId(newSessionId);
    
    // Reset positions, settings and timers
    snakeRef.current = [{ ...STARTING_POSITION }];
    directionRef.current = STARTING_DIRECTION;
    setActiveDirection(STARTING_DIRECTION);
    nextDirectionRef.current = STARTING_DIRECTION;
    speedRef.current = INITIAL_SPEED;
    particlesRef.current = [];
    setScore(0);
    setIsNewHighScore(false);
    setSubmittedScore(null);
    setSubmitError("");
    
    startTimeRef.current = Date.now();
    totalPausedTimeRef.current = 0;
    pausedTimeRef.current = 0;

    // Reset daily challenge seed
    if (mode === "daily") {
      prngRef.current = getDailyPrng();
    } else {
      prngRef.current = null;
    }

    spawnFood();
    setGameState("playing");

    const todayUTC = new Date().toISOString().split("T")[0];
    
    trackEvent("game_started", {
      game_session_id: newSessionId,
      game_mode: mode,
      challenge_date: mode === "daily" ? todayUTC : undefined,
    });

    if (mode === "daily") {
      trackEvent("daily_challenge_started", {
        game_session_id: newSessionId,
        challenge_date: todayUTC,
      });
    }
  };

  // Pause and Resume
  const pauseGame = () => {
    if (gameState !== "playing") return;
    setGameState("paused");
    pausedTimeRef.current = Date.now();
  };

  const resumeGame = () => {
    if (gameState !== "paused") return;
    totalPausedTimeRef.current += Date.now() - pausedTimeRef.current;
    setGameState("playing");
  };

  // Keyboard Event Handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const currentDirection = directionRef.current;
    let newDir: Direction | null = null;

    switch (e.key) {
      case "ArrowUp":
      case "w":
      case "W":
        if (currentDirection !== "DOWN") newDir = "UP";
        break;
      case "ArrowDown":
      case "s":
      case "S":
        if (currentDirection !== "UP") newDir = "DOWN";
        break;
      case "ArrowLeft":
      case "a":
      case "A":
        if (currentDirection !== "RIGHT") newDir = "LEFT";
        break;
      case "ArrowRight":
      case "d":
      case "D":
        if (currentDirection !== "LEFT") newDir = "RIGHT";
        break;
      case "Escape":
        if (gameState === "playing") pauseGame();
        else if (gameState === "paused") resumeGame();
        break;
      case " ":
        if (gameState === "idle" || gameState === "gameover") startGame();
        break;
    }

    if (newDir) {
      nextDirectionRef.current = newDir;
      // Prevent screen scrolling with arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    }
  }, [gameState]);

  // Register Keyboard Listeners
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Touch Swipe Handlers (Mobile Swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };


  const handleTouchEnd = (e: React.TouchEvent) => {
    if (gameState !== "playing") return;

    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const threshold = 30; // Min swipe distance
    const currentDirection = directionRef.current;

    if (Math.abs(dx) > Math.abs(dy)) {
      // Horizontal swipe
      if (Math.abs(dx) > threshold) {
        if (dx > 0 && currentDirection !== "LEFT") nextDirectionRef.current = "RIGHT";
        else if (dx < 0 && currentDirection !== "RIGHT") nextDirectionRef.current = "LEFT";
      }
    } else {
      // Vertical swipe
      if (Math.abs(dy) > threshold) {
        if (dy > 0 && currentDirection !== "UP") nextDirectionRef.current = "DOWN";
        else if (dy < 0 && currentDirection !== "DOWN") nextDirectionRef.current = "UP";
      }
    }
  };

  // Virtual Onscreen D-pad clicks (Mobile Button Tap)
  const handleVirtualControl = (newDir: Direction) => {
    if (gameState !== "playing") return;
    const currentDirection = directionRef.current;

    if (newDir === "UP" && currentDirection !== "DOWN") nextDirectionRef.current = "UP";
    if (newDir === "DOWN" && currentDirection !== "UP") nextDirectionRef.current = "DOWN";
    if (newDir === "LEFT" && currentDirection !== "RIGHT") nextDirectionRef.current = "LEFT";
    if (newDir === "RIGHT" && currentDirection !== "LEFT") nextDirectionRef.current = "RIGHT";
  };

  // Scoring Submission POST
  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError("");

    // Cache name locally
    safeLocalStorage.setItem("snake_display_name", displayName.trim());

    const todayUTC = new Date().toISOString().split("T")[0];

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_session_id: gameSessionId,
          client_id: clientId,
          display_name: displayName.trim(),
          score,
          game_mode: mode,
          challenge_date: mode === "daily" ? todayUTC : null,
          duration_ms: durationMs,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Submission failed");
      }

      setSubmittedScore(result.score);
      trackEvent("score_submitted", {
        game_session_id: gameSessionId,
        game_mode: mode,
        score,
        duration_ms: durationMs,
        challenge_date: mode === "daily" ? todayUTC : undefined,
      });

      if (onScoreSubmitted) {
        onScoreSubmitted();
      }
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Share Dialog functionality
  const getShareUrl = () => {
    const id = submittedScore?.id || gameSessionId;
    return `${window.location.origin}/score/${id}`;
  };

  const handleShare = async () => {
    trackEvent("share_clicked", {
      game_session_id: gameSessionId,
      game_mode: mode,
      score,
    });

    const shareText = `🐍 I scored ${score.toLocaleString()} on SnakeComputerGame.com! Can you beat my score?`;
    const shareUrl = getShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Snake Score",
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log("Web Share aborted or failed:", err);
      }
    } else {
      // Fallback: Show manual links via state copy
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const shareToTwitter = () => {
    trackEvent("share_clicked", {
      game_session_id: gameSessionId,
      game_mode: mode,
      score,
      platform: "twitter",
    });
    const text = encodeURIComponent(`🐍 I scored ${score.toLocaleString()} on SnakeComputerGame.com! Can you beat me? ${getShareUrl()}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const shareToWhatsApp = () => {
    trackEvent("share_clicked", {
      game_session_id: gameSessionId,
      game_mode: mode,
      score,
      platform: "whatsapp",
    });
    const text = encodeURIComponent(`🐍 I scored ${score.toLocaleString()} on SnakeComputerGame.com! Can you beat me? ${getShareUrl()}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  // --- Canvas Rendering Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cellSize = canvas.width / GRID_SIZE.width;

      // Draw Grid helper lines subtly
      ctx.strokeStyle = "rgba(31, 41, 55, 0.4)";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= GRID_SIZE.width; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i <= GRID_SIZE.height; i++) {
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
      }

      // Draw Food (Pulsing Neon Circle)
      const food = foodRef.current;
      const foodRadius = cellSize / 2.3;
      const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.1;
      
      ctx.save();
      ctx.shadowColor = "#ff007f";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#ff007f";
      ctx.beginPath();
      ctx.arc(
        food.x * cellSize + cellSize / 2,
        food.y * cellSize + cellSize / 2,
        foodRadius * pulse,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      // Draw Snake segments
      const snake = snakeRef.current;
      snake.forEach((seg, index) => {
        const isHead = index === 0;
        
        ctx.save();
        if (isHead) {
          ctx.fillStyle = "#39ff14"; // Bright neon green for head
          ctx.shadowColor = "#39ff14";
          ctx.shadowBlur = 12;
        } else {
          // Gradient tail effect
          const opacity = Math.max(0.4, 1 - index / snake.length);
          ctx.fillStyle = `rgba(57, 255, 20, ${opacity})`;
        }

        // Round segment corners for custom feel
        const padding = isHead ? 1 : 2;
        const size = cellSize - padding * 2;
        const x = seg.x * cellSize + padding;
        const y = seg.y * cellSize + padding;

        ctx.beginPath();
        ctx.roundRect(x, y, size, size, isHead ? 5 : 3);
        ctx.fill();
        ctx.restore();

        // Snake eyes if head
        if (isHead) {
          ctx.fillStyle = "#090d16";
          const eyeSize = cellSize / 6;
          const offset = cellSize / 4;
          const centerX = seg.x * cellSize + cellSize / 2;
          const centerY = seg.y * cellSize + cellSize / 2;

          // Place eyes relative to head direction
          if (directionRef.current === "RIGHT" || directionRef.current === "LEFT") {
            ctx.fillRect(centerX - (directionRef.current === "RIGHT" ? -offset/2 : offset), centerY - offset, eyeSize, eyeSize);
            ctx.fillRect(centerX - (directionRef.current === "RIGHT" ? -offset/2 : offset), centerY + offset - eyeSize, eyeSize, eyeSize);
          } else {
            ctx.fillRect(centerX - offset, centerY - (directionRef.current === "DOWN" ? -offset/2 : offset), eyeSize, eyeSize);
            ctx.fillRect(centerX + offset - eyeSize, centerY - (directionRef.current === "DOWN" ? -offset/2 : offset), eyeSize, eyeSize);
          }
        }
      });

      // Update and Draw eating/death particles
      const particles = particlesRef.current;
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        p.life -= 0.03;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.restore();

        if (p.life <= 0) {
          particles.splice(idx, 1);
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // --- Clock tick interval for moving snake ---
  useEffect(() => {
    if (gameState !== "playing") return;

    const tick = () => {
      updateGame();
      gameLoopRef.current = window.setTimeout(tick, speedRef.current);
    };

    gameLoopRef.current = window.setTimeout(tick, speedRef.current);

    return () => {
      if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
    };
  }, [gameState, updateGame]);

  return (
    <div className="flex flex-col items-center w-full max-w-lg mx-auto">
      {/* Top Banner Status Bar */}
      <div className="w-full flex justify-between items-center bg-gray-900 border border-gray-800 px-4 py-2.5 rounded-t-lg font-mono text-xs uppercase tracking-wider text-slate-400">
        <div className="flex items-center gap-3">
          <span>Mode: <span className="text-arcade-cyan font-bold">{mode}</span></span>
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
              const newVal = !showDpad;
              setShowDpad(newVal);
              safeLocalStorage.setItem("snake_show_dpad", String(newVal));
            }}
            onClick={() => {
              const newVal = !showDpad;
              setShowDpad(newVal);
              safeLocalStorage.setItem("snake_show_dpad", String(newVal));
            }}
            className="text-[9px] bg-[#111827] hover:bg-gray-800 text-slate-300 px-2 py-0.5 rounded border border-gray-700 transition cursor-pointer flex items-center gap-1 font-bold font-mono tracking-normal"
          >
            🕹️ {showDpad ? "HIDE PAD" : "SHOW PAD"}
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div>
            Score: <span className="text-arcade-green font-bold text-sm">{score.toLocaleString()}</span>
          </div>
          <div>
            Best: <span className="text-arcade-yellow font-bold text-sm">{highScore.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Game Frame Container */}
      <div 
        className={`relative w-full aspect-[4/5] bg-[#090d16] border-x border-b border-gray-800 scanlines overflow-hidden touch-none ${
          !showDpad ? "rounded-b-lg" : ""
        }`}
        style={{ touchAction: "none" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={400}
          height={500}
          className="w-full h-full block"
        />

        {/* OVERLAY: Idle State */}
        {gameState === "idle" && (
          <div className="absolute inset-0 bg-[#090d16]/90 flex flex-col justify-center items-center z-20 text-center px-6">
            <h2 className="font-arcade text-arcade-green text-2xl mb-4 tracking-widest glow-text-green animate-pulse">
              READY?
            </h2>
            <button
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                startGame();
              }}
              onClick={startGame}
              className="px-8 py-3 bg-arcade-green hover:bg-green-400 text-black font-arcade text-sm rounded shadow-lg transition duration-200 uppercase tracking-widest cursor-pointer glow-green transform active:scale-95 touch-none select-none"
              style={{ touchAction: "none" }}
            >
              PLAY
            </button>
            <p className="text-xs text-slate-500 font-mono mt-6">
              Press SPACE or click PLAY to start.<br />
              Use Arrow keys or WASD on desktop.<br />
              Swipe screen on mobile.
            </p>
          </div>
        )}

        {/* OVERLAY: Paused State */}
        {gameState === "paused" && (
          <div className="absolute inset-0 bg-[#090d16]/85 flex flex-col justify-center items-center z-20 text-center">
            <h2 className="font-arcade text-arcade-cyan text-xl mb-4 tracking-widest glow-text-cyan animate-pulse">
              PAUSED
            </h2>
            <button
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
                resumeGame();
              }}
              onClick={resumeGame}
              className="px-6 py-2.5 bg-arcade-cyan hover:bg-cyan-400 text-black font-arcade text-xs rounded transition duration-200 uppercase tracking-widest cursor-pointer glow-cyan touch-none select-none"
              style={{ touchAction: "none" }}
            >
              RESUME
            </button>
          </div>
        )}

        {/* OVERLAY: Game Over State */}
        {gameState === "gameover" && (
          <div className="absolute inset-0 bg-[#0b0f19]/95 flex flex-col justify-center items-center z-20 text-center px-4 overflow-y-auto py-4">
            <h2 className="font-arcade text-arcade-pink text-2xl mb-2 tracking-widest glow-text-pink animate-bounce">
              GAME OVER
            </h2>
            
            <div className="font-arcade text-xs text-slate-300 mt-2 mb-4 space-y-1">
              <div>SCORE: <span className="text-arcade-green text-sm">{score.toLocaleString()}</span></div>
              <div>BEST: <span className="text-arcade-yellow text-sm">{highScore.toLocaleString()}</span></div>
              {isNewHighScore && (
                <div className="text-arcade-yellow text-[10px] animate-pulse mt-1">
                  🎉 NEW HIGH SCORE!
                </div>
              )}
            </div>

            {/* Score Submission Form */}
            {!submittedScore && (
              <form 
                onSubmit={handleSubmitScore} 
                className="w-full max-w-xs mb-4 p-3 bg-gray-900/60 border border-gray-800 rounded touch-auto"
                style={{ touchAction: "auto" }}
              >
                <label className="block text-[10px] font-arcade text-slate-400 mb-1.5 uppercase">
                  Submit to Leaderboard
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
                    placeholder="Enter Name"
                    maxLength={20}
                    className="flex-1 bg-black text-slate-100 border border-gray-800 focus:border-arcade-green outline-none text-xs p-2 font-mono rounded"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !displayName.trim()}
                    className="px-3 bg-arcade-green hover:bg-green-400 disabled:bg-gray-800 text-black font-arcade text-[10px] rounded transition duration-150 uppercase tracking-wider cursor-pointer"
                  >
                    {isSubmitting ? "..." : "SEND"}
                  </button>
                </div>
                {submitError && (
                  <p className="text-[10px] text-arcade-pink font-mono mt-1 text-left">
                    ⚠️ {submitError}
                  </p>
                )}
              </form>
            )}

            {submittedScore && (
              <div className="w-full max-w-xs mb-5 p-3 border border-arcade-green/30 bg-arcade-green/5 text-slate-300 font-mono text-[11px] rounded flex flex-col items-center">
                <span className="text-arcade-green text-xs font-arcade tracking-wider mb-1">✓ SUBMITTED</span>
                <span>Submitted as <strong className="text-white">{submittedScore.display_name}</strong></span>
              </div>
            )}

            {/* CTAs Hierarchy: Play Again (Primary), Share (Secondary) */}
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  startGame();
                }}
                onClick={startGame}
                className="w-full py-3 bg-arcade-green hover:bg-green-400 text-black font-arcade text-xs rounded transition duration-200 uppercase tracking-widest glow-green cursor-pointer transform active:scale-95 font-bold touch-none select-none"
                style={{ touchAction: "none" }}
              >
                PLAY AGAIN
              </button>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleShare}
                  className="flex-1 py-2 bg-gray-900 border border-gray-800 hover:border-slate-500 text-slate-300 font-arcade text-[9px] rounded flex items-center justify-center gap-1.5 transition duration-150 uppercase cursor-pointer"
                >
                  {copySuccess ? <Check size={11} className="text-arcade-green" /> : <Share2 size={11} />}
                  {copySuccess ? "COPIED" : "SHARE LINK"}
                </button>

                <button
                  onClick={shareToTwitter}
                  title="Share to Twitter"
                  className="px-2.5 bg-gray-900 border border-gray-800 hover:border-arcade-cyan text-slate-300 rounded flex items-center justify-center transition duration-150 cursor-pointer"
                >
                  <svg className="w-3 h-3 text-arcade-cyan fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </button>
                
                <button
                  onClick={shareToWhatsApp}
                  title="Share to WhatsApp"
                  className="px-2.5 bg-gray-900 border border-gray-800 hover:border-arcade-green text-slate-300 rounded flex items-center justify-center transition duration-150 cursor-pointer"
                >
                  <span className="text-[10px] text-arcade-green font-bold">WA</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Small in-game pause button overlay */}
        {gameState === "playing" && (
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              e.preventDefault();
              pauseGame();
            }}
            onClick={pauseGame}
            className="absolute top-2.5 right-2.5 p-1.5 bg-black/40 border border-gray-800/50 hover:bg-black/80 rounded transition cursor-pointer text-slate-400 hover:text-white touch-none"
            style={{ touchAction: "none" }}
          >
            <Pause size={12} />
          </button>
        )}
      </div>

      {/* Virtual D-pad (Mobile Only) */}
      {showDpad && (
        <div className="w-full bg-gray-900/40 border-x border-b border-gray-800 p-4 flex flex-col items-center justify-center gap-1 rounded-b-lg">
          {/* Helper layout text */}
          <p className="text-[10px] font-mono text-slate-500 mb-2 block md:hidden">
            TAP VIRTUAL D-PAD OR SWIPE SCREEN
          </p>
          
          {/* Buttons D-Pad grid */}
          <div className="grid grid-cols-3 gap-2 w-32 select-none touch-none" style={{ touchAction: "none" }}>
            <div></div>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                handleVirtualControl("UP");
              }}
              onClick={() => handleVirtualControl("UP")}
              disabled={gameState !== "playing" || activeDirection === "DOWN"}
              className="w-10 h-10 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 active:border-arcade-cyan active:bg-gray-900 text-slate-300 rounded flex items-center justify-center font-bold outline-none cursor-pointer touch-none select-none"
              style={{ touchAction: "none" }}
            >
              ▲
            </button>
            <div></div>

            <button
              onTouchStart={(e) => {
                e.preventDefault();
                handleVirtualControl("LEFT");
              }}
              onClick={() => handleVirtualControl("LEFT")}
              disabled={gameState !== "playing" || activeDirection === "RIGHT"}
              className="w-10 h-10 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 active:border-arcade-cyan active:bg-gray-900 text-slate-300 rounded flex items-center justify-center font-bold outline-none cursor-pointer touch-none select-none"
              style={{ touchAction: "none" }}
            >
              ◀
            </button>
            <div className="w-10 h-10 bg-gray-900 border border-gray-800 rounded flex items-center justify-center text-slate-600 text-xs font-mono select-none">
              {score}
            </div>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                handleVirtualControl("RIGHT");
              }}
              onClick={() => handleVirtualControl("RIGHT")}
              disabled={gameState !== "playing" || activeDirection === "LEFT"}
              className="w-10 h-10 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 active:border-arcade-cyan active:bg-gray-900 text-slate-300 rounded flex items-center justify-center font-bold outline-none cursor-pointer touch-none select-none"
              style={{ touchAction: "none" }}
            >
              ▶
            </button>

            <div></div>
            <button
              onTouchStart={(e) => {
                e.preventDefault();
                handleVirtualControl("DOWN");
              }}
              onClick={() => handleVirtualControl("DOWN")}
              disabled={gameState !== "playing" || activeDirection === "UP"}
              className="w-10 h-10 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 active:border-arcade-cyan active:bg-gray-900 text-slate-300 rounded flex items-center justify-center font-bold outline-none cursor-pointer touch-none select-none"
              style={{ touchAction: "none" }}
            >
              ▼
            </button>
            <div></div>
          </div>
        </div>
      )}
    </div>
  );
}
