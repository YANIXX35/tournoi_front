export interface Team {
  id: number;
  name: string;
  captain_name: string;
  phone: string;
  logo_path: string | null;
  created_at: string;
  validated: number;
  players: string[];
}

export interface PlayerRegistration {
  player_name: string;
  photo_path: string | null;
}

export interface TeamRegistration {
  name: string;
  captain_name: string;
  phone: string;
  logo_path: string | null;
  players: PlayerRegistration[];
}
