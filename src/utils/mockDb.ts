export interface ScoreEntry {
  id: string;
  game_session_id: string;
  client_id: string;
  display_name: string;
  score: number;
  game_mode: string;
  challenge_date: string | null;
  duration_ms: number;
  created_at: string;
}

const todayStr = new Date().toISOString().split("T")[0];

// Shared in-memory list for development mock data
export let mockScores: ScoreEntry[] = [
  { id: "1", game_session_id: "s1", client_id: "c1", display_name: "SnakeMaster", score: 2450, game_mode: "classic", challenge_date: null, duration_ms: 120000, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: "2", game_session_id: "s2", client_id: "c2", display_name: "Player#1932", score: 1890, game_mode: "classic", challenge_date: null, duration_ms: 95000, created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: "3", game_session_id: "s3", client_id: "c3", display_name: "Snake#4821", score: 1420, game_mode: "classic", challenge_date: null, duration_ms: 80000, created_at: new Date(Date.now() - 10800000).toISOString() },
  { id: "4", game_session_id: "s4", client_id: "c4", display_name: "Player#7291", score: 950,  game_mode: "classic", challenge_date: null, duration_ms: 60000, created_at: new Date(Date.now() - 14400000).toISOString() },
];

export let mockDailyScores: ScoreEntry[] = [
  { id: "d1", game_session_id: "ds1", client_id: "c1", display_name: "RetroSnake", score: 850, game_mode: "daily", challenge_date: todayStr, duration_ms: 60000, created_at: new Date(Date.now() - 2000000).toISOString() },
  { id: "d2", game_session_id: "ds2", client_id: "c2", display_name: "Player#0481", score: 720, game_mode: "daily", challenge_date: todayStr, duration_ms: 50000, created_at: new Date(Date.now() - 4000000).toISOString() },
  { id: "d3", game_session_id: "ds3", client_id: "c3", display_name: "SnakeKing", score: 550, game_mode: "daily", challenge_date: todayStr, duration_ms: 45000, created_at: new Date(Date.now() - 6000000).toISOString() },
];

export function addMockScore(score: ScoreEntry) {
  if (score.game_mode === "classic") {
    mockScores.push(score);
  } else {
    mockDailyScores.push(score);
  }
}
