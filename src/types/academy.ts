export const ACADEMY_AGE_GROUPS = [
  "skrzaty",
  "zaki",
  "orliki",
  "mlodziki",
  "trampkarze",
  "juniorzy",
  "seniorzy",
] as const;
export type AcademyAgeGroup = (typeof ACADEMY_AGE_GROUPS)[number];

export const ACADEMY_STAFF_ROLES = ["head_coach", "assistant_coach", "goalkeeper_coach"] as const;
export type AcademyStaffRole = (typeof ACADEMY_STAFF_ROLES)[number];

export const PLAYER_GOAL_STATUSES = ["active", "completed", "cancelled"] as const;
export type PlayerGoalStatus = (typeof PLAYER_GOAL_STATUSES)[number];

export const FITNESS_TEST_TYPES = [
  "sprint_5m",
  "sprint_10m",
  "sprint_30m",
  "beep_test",
  "vertical_jump",
  "agility",
] as const;
export type FitnessTestType = (typeof FITNESS_TEST_TYPES)[number];

export const SCOUTING_PLAYER_STATUSES = [
  "observed",
  "testing",
  "recommended",
  "rejected",
  "signed",
] as const;
export type ScoutingPlayerStatus = (typeof SCOUTING_PLAYER_STATUSES)[number];

export const SCOUTING_CLUB_TYPES = ["league_opponent", "academy", "partner"] as const;
export type ScoutingClubType = (typeof SCOUTING_CLUB_TYPES)[number];

export const TEAM_TRANSITION_TYPES = ["promotion", "demotion", "loan", "other"] as const;
export type TeamTransitionType = (typeof TEAM_TRANSITION_TYPES)[number];

export const DEVELOPMENT_CHART_RANGES = ["month", "half_year", "year", "all"] as const;
export type DevelopmentChartRange = (typeof DEVELOPMENT_CHART_RANGES)[number];

export const ASSESSMENT_CATEGORIES = [
  "technique",
  "speed",
  "motorics",
  "endurance",
  "strength",
  "tactics",
  "engagement",
  "discipline",
  "cooperation",
] as const;
export type AssessmentCategory = (typeof ASSESSMENT_CATEGORIES)[number];

export type AcademyGroup = {
  id: string;
  clubId: string;
  ageGroup: AcademyAgeGroup;
  teamId: string | null;
  teamName: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  playerCount?: number;
  staffCount?: number;
};

export type AcademyGroupStaff = {
  id: string;
  clubId: string;
  groupId: string;
  profileId: string;
  staffName: string | null;
  staffRole: AcademyStaffRole;
};

export type PlayerDevelopment = {
  id: string;
  clubId: string;
  playerId: string;
  potential: number;
  developmentLevel: number;
  overallRating: number;
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string;
};

export type PlayerDevelopmentHistory = {
  id: string;
  clubId: string;
  playerId: string;
  potential: number;
  developmentLevel: number;
  overallRating: number;
  note: string | null;
  recordedBy: string | null;
  recordedAt: string;
};

export type PlayerAssessment = {
  id: string;
  clubId: string;
  playerId: string;
  assessorId: string | null;
  assessorName: string | null;
  assessedAt: string;
  technique: number;
  speed: number;
  motorics: number;
  endurance: number;
  strength: number;
  tactics: number;
  engagement: number;
  discipline: number;
  cooperation: number;
  averageScore: number;
  notes: string | null;
};

export type PlayerGoal = {
  id: string;
  clubId: string;
  playerId: string;
  title: string;
  description: string | null;
  status: PlayerGoalStatus;
  targetDate: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
};

export type FitnessTest = {
  id: string;
  clubId: string;
  playerId: string;
  testType: FitnessTestType;
  resultValue: number;
  unit: string;
  testDate: string;
  notes: string | null;
  recordedBy: string | null;
};

export type PlayerTeamTransition = {
  id: string;
  clubId: string;
  playerId: string;
  fromAgeGroup: AcademyAgeGroup | null;
  toAgeGroup: AcademyAgeGroup;
  fromTeamId: string | null;
  toTeamId: string | null;
  transitionDate: string;
  transitionType: TeamTransitionType;
  reason: string;
  decisionBy: string | null;
  decisionByName: string | null;
  notes: string | null;
};

export type ScoutingPlayer = {
  id: string;
  clubId: string;
  firstName: string;
  lastName: string;
  externalClubName: string;
  position: string;
  birthDate: string | null;
  ageYears: number | null;
  status: ScoutingPlayerStatus;
  notes: string | null;
  scoutedBy: string | null;
  scoutedByName: string | null;
  linkedPlayerId: string | null;
  createdAt: string;
};

export type ScoutingClub = {
  id: string;
  clubId: string;
  name: string;
  clubType: ScoutingClubType;
  city: string | null;
  contactInfo: string | null;
  notes: string | null;
};

export type ScoutingReport = {
  id: string;
  clubId: string;
  scoutingPlayerId: string | null;
  playerId: string | null;
  playerName: string | null;
  authorId: string | null;
  authorName: string | null;
  reportDate: string;
  technique: number;
  motorics: number;
  tactics: number;
  character: number;
  potential: number;
  finalRating: number;
  summary: string | null;
};

export type OpponentAnalysis = {
  id: string;
  clubId: string;
  opponentName: string;
  scoutingClubId: string | null;
  strengths: string;
  weaknesses: string;
  keyPlayers: string;
  tacticalSetup: string;
  analysisDate: string;
  authorId: string | null;
  authorName: string | null;
};

export type TalentRankingEntry = {
  playerId: string;
  playerName: string;
  teamName: string | null;
  overallRating: number;
  potential: number;
  averageAssessment: number;
  attendanceRate: number;
  progressScore: number;
  talentScore: number;
  rank: number;
};

export type AcademyDashboardStats = {
  groupCount: number;
  assessedPlayers: number;
  activeGoals: number;
  scoutingProspects: number;
  pendingRecommendations: number;
};

export type PlayerDevelopmentDetail = {
  development: PlayerDevelopment | null;
  history: PlayerDevelopmentHistory[];
  assessments: PlayerAssessment[];
  goals: PlayerGoal[];
  fitnessTests: FitnessTest[];
  transitions: PlayerTeamTransition[];
};
