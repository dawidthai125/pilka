import type { FormationCode, MatchEventType, MatchSquadRole, MatchStatus } from "@/types/matches";

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  planned: "Zaplanowany",
  in_progress: "W trakcie",
  completed: "Zakończony",
  cancelled: "Odwołany",
  postponed: "Przełożony",
};

export const MATCH_SQUAD_ROLE_LABELS: Record<MatchSquadRole, string> = {
  squad: "Kadra",
  starter: "Podstawowy",
  substitute: "Rezerwowy",
};

export const MATCH_EVENT_TYPE_LABELS: Record<MatchEventType, string> = {
  goal: "Gol",
  assist: "Asysta",
  yellow_card: "Żółta kartka",
  red_card: "Czerwona kartka",
  substitution: "Zmiana",
  injury: "Kontuzja",
};

export const FORMATION_LABELS: Record<FormationCode, string> = {
  "4-4-2": "4-4-2",
  "4-3-3": "4-3-3",
  "3-5-2": "3-5-2",
  "4-2-3-1": "4-2-3-1",
};

export const DEFAULT_COMPETITION = "B Klasa";
export const DEFAULT_SEASON = "2025/2026";

export type FormationSlot = { slotCode: string; posX: number; posY: number };

export const FORMATION_PRESETS: Record<FormationCode, FormationSlot[]> = {
  "4-4-2": [
    { slotCode: "GK", posX: 50, posY: 92 },
    { slotCode: "LB", posX: 15, posY: 72 },
    { slotCode: "CB1", posX: 35, posY: 75 },
    { slotCode: "CB2", posX: 65, posY: 75 },
    { slotCode: "RB", posX: 85, posY: 72 },
    { slotCode: "LM", posX: 15, posY: 50 },
    { slotCode: "CM1", posX: 38, posY: 52 },
    { slotCode: "CM2", posX: 62, posY: 52 },
    { slotCode: "RM", posX: 85, posY: 50 },
    { slotCode: "ST1", posX: 38, posY: 22 },
    { slotCode: "ST2", posX: 62, posY: 22 },
  ],
  "4-3-3": [
    { slotCode: "GK", posX: 50, posY: 92 },
    { slotCode: "LB", posX: 15, posY: 72 },
    { slotCode: "CB1", posX: 35, posY: 75 },
    { slotCode: "CB2", posX: 65, posY: 75 },
    { slotCode: "RB", posX: 85, posY: 72 },
    { slotCode: "CM1", posX: 30, posY: 52 },
    { slotCode: "CM2", posX: 50, posY: 55 },
    { slotCode: "CM3", posX: 70, posY: 52 },
    { slotCode: "LW", posX: 18, posY: 25 },
    { slotCode: "ST", posX: 50, posY: 18 },
    { slotCode: "RW", posX: 82, posY: 25 },
  ],
  "3-5-2": [
    { slotCode: "GK", posX: 50, posY: 92 },
    { slotCode: "CB1", posX: 25, posY: 75 },
    { slotCode: "CB2", posX: 50, posY: 78 },
    { slotCode: "CB3", posX: 75, posY: 75 },
    { slotCode: "LWB", posX: 12, posY: 55 },
    { slotCode: "CM1", posX: 35, posY: 52 },
    { slotCode: "CM2", posX: 50, posY: 50 },
    { slotCode: "CM3", posX: 65, posY: 52 },
    { slotCode: "RWB", posX: 88, posY: 55 },
    { slotCode: "ST1", posX: 38, posY: 22 },
    { slotCode: "ST2", posX: 62, posY: 22 },
  ],
  "4-2-3-1": [
    { slotCode: "GK", posX: 50, posY: 92 },
    { slotCode: "LB", posX: 15, posY: 72 },
    { slotCode: "CB1", posX: 35, posY: 75 },
    { slotCode: "CB2", posX: 65, posY: 75 },
    { slotCode: "RB", posX: 85, posY: 72 },
    { slotCode: "DM1", posX: 38, posY: 58 },
    { slotCode: "DM2", posX: 62, posY: 58 },
    { slotCode: "LW", posX: 18, posY: 35 },
    { slotCode: "AM", posX: 50, posY: 32 },
    { slotCode: "RW", posX: 82, posY: 35 },
    { slotCode: "ST", posX: 50, posY: 18 },
  ],
};
