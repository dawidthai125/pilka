import { canReadAcademy, canReadOwnDevelopment, canReadScouting } from "@/config/permissions";
import type {
  AcademyAgeGroup,
  AcademyStaffRole,
  DevelopmentChartRange,
  FitnessTestType,
  PlayerGoalStatus,
  ScoutingClubType,
  ScoutingPlayerStatus,
  TeamTransitionType,
} from "@/types/academy";
import type { ClubRole } from "@/types/rbac";

export const ACADEMY_AGE_GROUP_LABELS: Record<AcademyAgeGroup, string> = {
  skrzaty: "Skrzaty",
  zaki: "Żaki",
  orliki: "Orliki",
  mlodziki: "Młodziki",
  trampkarze: "Trampkarze",
  juniorzy: "Juniorzy",
  seniorzy: "Seniorzy",
};

export const ACADEMY_STAFF_ROLE_LABELS: Record<AcademyStaffRole, string> = {
  head_coach: "Trener główny",
  assistant_coach: "Asystent",
  goalkeeper_coach: "Trener bramkarzy",
};

export const PLAYER_GOAL_STATUS_LABELS: Record<PlayerGoalStatus, string> = {
  active: "Aktywny",
  completed: "Zakończony",
  cancelled: "Anulowany",
};

export const FITNESS_TEST_TYPE_LABELS: Record<FitnessTestType, string> = {
  sprint_5m: "Sprint 5 m",
  sprint_10m: "Sprint 10 m",
  sprint_30m: "Sprint 30 m",
  beep_test: "Beep test",
  vertical_jump: "Wyskok",
  agility: "Agility",
};

export const FITNESS_TEST_UNITS: Record<FitnessTestType, string> = {
  sprint_5m: "s",
  sprint_10m: "s",
  sprint_30m: "s",
  beep_test: "poziom",
  vertical_jump: "cm",
  agility: "s",
};

export const SCOUTING_PLAYER_STATUS_LABELS: Record<ScoutingPlayerStatus, string> = {
  observed: "Obserwowany",
  testing: "Testowany",
  recommended: "Rekomendowany",
  rejected: "Odrzucony",
  signed: "Pozyskany",
};

export const SCOUTING_CLUB_TYPE_LABELS: Record<ScoutingClubType, string> = {
  league_opponent: "Przeciwnik ligowy",
  academy: "Akademia",
  partner: "Klub partnerski",
};

export const TEAM_TRANSITION_TYPE_LABELS: Record<TeamTransitionType, string> = {
  promotion: "Awans",
  demotion: "Spadek",
  loan: "Wypożyczenie",
  other: "Inne",
};

export const DEVELOPMENT_CHART_RANGE_LABELS: Record<DevelopmentChartRange, string> = {
  month: "Miesiąc",
  half_year: "Pół roku",
  year: "Rok",
  all: "Cały okres",
};

export const ASSESSMENT_CATEGORY_LABELS = {
  technique: "Technika",
  speed: "Szybkość",
  motorics: "Motoryka",
  endurance: "Wytrzymałość",
  strength: "Siła",
  tactics: "Taktyka",
  engagement: "Zaangażowanie",
  discipline: "Dyscyplina",
  cooperation: "Współpraca",
} as const;

export const ACADEMY_NAV = [
  { href: "/academy", label: "Przegląd" },
  { href: "/academy/groups", label: "Grupy" },
  { href: "/academy/development", label: "Rozwój" },
  { href: "/academy/talents", label: "Ranking talentów" },
  { href: "/academy/scouting", label: "Skauting" },
  { href: "/academy/opponents", label: "Przeciwnicy" },
] as const;

export function getAcademyNavItems(roles: ClubRole[]) {
  const staff = canReadAcademy(roles);
  const own = canReadOwnDevelopment(roles);
  const scouting = canReadScouting(roles);

  return ACADEMY_NAV.filter((item) => {
    if (item.href === "/academy/development") return staff || own;
    if (item.href === "/academy/scouting" || item.href === "/academy/opponents") return scouting;
    return staff;
  });
}

export const ACADEMY_AI_PROMPTS = {
  development: [
    "Oceń rozwój zawodnika",
    "Pokaż największy progres w akademii",
    "Pokaż zawodników do awansu",
    "Pokaż zawodników z regresją",
  ],
  scouting: [
    "Pokaż najlepszych obserwowanych zawodników",
    "Wygeneruj raport skautingowy",
    "Pokaż zawodników pasujących do pozycji",
  ],
} as const;
