export interface Match {
  id: number;
  team1_id: number | null;
  team2_id: number | null;
  team1_name: string;
  team2_name: string;
  match_date: string;
  match_time: string;
  phase: string;
  score1: number | null;
  score2: number | null;
  status: 'upcoming' | 'ongoing' | 'finished';
}

export interface Goal {
  id: number;
  match_id: number;
  player_name: string;
  team_name: string;
  type: 'goal' | 'assist';
  minute: number | null;
}

export interface TopScorer {
  player_name: string;
  team_name: string;
  type: 'goal' | 'assist';
  total: number;
}

export interface Standing {
  id: number;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  points: number;
}
