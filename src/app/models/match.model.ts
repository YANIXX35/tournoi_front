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
  terrain: string | null;
  match_number: number | null;
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

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent';
  active?: boolean;
  created_at: string;
}

export interface GalleryPhoto {
  id: number;
  title: string | null;
  photo_path: string;
  created_at: string;
}

export interface TeamDetail {
  id: number;
  name: string;
  captain_name: string;
  logo_path: string | null;
  created_at: string | null;
  players: { id: number; player_name: string; photo_path: string | null }[];
  matches: Match[];
  stats: { played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number; points: number };
  scorers: { player_name: string; type: string; total: number }[];
}

export interface AdminLog {
  id: number;
  username: string;
  action: string;
  details: string | null;
  created_at: string;
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
