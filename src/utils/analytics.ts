export interface AnalyticsEventParams {
  game_session_id?: string;
  game_mode?: "classic" | "daily";
  score?: number;
  duration_ms?: number;
  challenge_date?: string;
  [key: string]: any;
}

export type AnalyticsEventName =
  | "page_view"
  | "game_started"
  | "game_completed"
  | "game_restarted"
  | "new_high_score"
  | "leaderboard_viewed"
  | "score_submitted"
  | "share_clicked"
  | "daily_challenge_started"
  | "daily_challenge_completed";

import { safeLocalStorage, safeSessionStorage } from "./safeStorage";

const IS_BROWSER = typeof window !== "undefined";

/**
 * Increments and returns the session game count and total lifetime visitor game count.
 */
function getAndIncrementCounters(eventName: AnalyticsEventName): {
  sessionCount: number;
  visitorCount: number;
} {
  if (!IS_BROWSER) {
    return { sessionCount: 0, visitorCount: 0 };
  }

  let sessionCount = parseInt(safeSessionStorage.getItem("snake_games_session_count") || "0", 10);
  let visitorCount = parseInt(safeLocalStorage.getItem("snake_games_visitor_count") || "0", 10);

  // Increment only when starting a game
  if (eventName === "game_started" || eventName === "daily_challenge_started") {
    sessionCount += 1;
    visitorCount += 1;
    safeSessionStorage.setItem("snake_games_session_count", sessionCount.toString());
    safeLocalStorage.setItem("snake_games_visitor_count", visitorCount.toString());
  }

  return { sessionCount, visitorCount };
}

/**
 * Abstract telemetry function. Emits logs in development, triggers web analytics integrations 
 * (like GA/gtag or Plausible) if available, and fires custom DOM events for browser testing.
 */
export function trackEvent(eventName: AnalyticsEventName, params: AnalyticsEventParams = {}) {
  const { sessionCount, visitorCount } = getAndIncrementCounters(eventName);

  const eventPayload = {
    timestamp: new Date().toISOString(),
    ...params,
    games_per_session_count: sessionCount,
    games_per_visitor_count: visitorCount,
  };

  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.log(`📊 [Analytics Event]: ${eventName}`, eventPayload);
  }

  if (IS_BROWSER) {
    const win = window as any;
    
    // Google Analytics Integration
    if (typeof win.gtag === "function") {
      win.gtag("event", eventName, eventPayload);
    }
    
    // Plausible Analytics Integration
    if (typeof win.plausible === "function") {
      win.plausible(eventName, { props: eventPayload });
    }

    // Custom Event Dispatch for browser-based automated verification or debug tools
    const customEvent = new CustomEvent("snake_analytics", {
      detail: { eventName, payload: eventPayload },
    });
    window.dispatchEvent(customEvent);
  }
}
