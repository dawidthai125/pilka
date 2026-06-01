import type { Permission } from "@/types/rbac";
import type { AiRiskLevel, AiToolDefinition, AiToolName } from "@/types/ai-agent";

export const AI_TOOL_REGISTRY: Record<AiToolName, AiToolDefinition> = {
  getPlayers: {
    name: "getPlayers",
    description: "Lista zawodników, frekwencja, kontuzje, dokumenty",
    riskLevel: "low",
    permissions: ["player:read"],
    requiresApproval: false,
  },
  getMatches: {
    name: "getMatches",
    description: "Terminarz i wyniki meczów",
    riskLevel: "low",
    permissions: ["match:read"],
    requiresApproval: false,
  },
  getTrainings: {
    name: "getTrainings",
    description: "Plan treningów i frekwencja",
    riskLevel: "low",
    permissions: ["training:read"],
    requiresApproval: false,
  },
  getSponsors: {
    name: "getSponsors",
    description: "Sponsorzy, kontrakty, brak kontaktu",
    riskLevel: "low",
    permissions: ["sponsor:read"],
    requiresApproval: false,
  },
  getFinances: {
    name: "getFinances",
    description: "Podsumowanie finansów, zaległe składki",
    riskLevel: "low",
    permissions: ["finance:read"],
    requiresApproval: false,
  },
  getDocuments: {
    name: "getDocuments",
    description: "Wygasające dokumenty zawodników",
    riskLevel: "low",
    permissions: ["player:read"],
    requiresApproval: false,
  },
  getInventory: {
    name: "getInventory",
    description: "Stan magazynu, braki, uszkodzenia",
    riskLevel: "low",
    permissions: ["inventory:read"],
    requiresApproval: false,
  },
  createTraining: {
    name: "createTraining",
    description: "Utwórz trening",
    riskLevel: "medium",
    permissions: ["training:manage"],
    requiresApproval: true,
  },
  createMatch: {
    name: "createMatch",
    description: "Utwórz mecz",
    riskLevel: "medium",
    permissions: ["match:manage"],
    requiresApproval: true,
  },
  createNotification: {
    name: "createNotification",
    description: "Wyślij przypomnienie / powiadomienie",
    riskLevel: "medium",
    permissions: ["training:manage"],
    requiresApproval: true,
  },
  generateReport: {
    name: "generateReport",
    description: "Wygeneruj raport AI (zarząd, mecze, treningi)",
    riskLevel: "medium",
    permissions: ["ai:reports"],
    requiresApproval: true,
  },
  generateNews: {
    name: "generateNews",
    description: "Przygotuj treść aktualności",
    riskLevel: "medium",
    permissions: ["website:create"],
    requiresApproval: true,
  },
  getVideos: {
    name: "getVideos",
    description: "Lista nagrań Video Center i status analiz",
    riskLevel: "low",
    permissions: ["video:read"],
    requiresApproval: false,
  },
  analyzeVideo: {
    name: "analyzeVideo",
    description: "Uruchom analizę AI nagrania wideo",
    riskLevel: "medium",
    permissions: ["video:manage"],
    requiresApproval: true,
  },
  generateVideoSummary: {
    name: "generateVideoSummary",
    description: "Przygotuj podsumowanie meczu/treningu dla zawodników",
    riskLevel: "medium",
    permissions: ["video:manage"],
    requiresApproval: true,
  },
  getContentPosts: {
    name: "getContentPosts",
    description: "Lista materiałów Content Hub i statusy publikacji",
    riskLevel: "low",
    permissions: ["content:read"],
    requiresApproval: false,
  },
  generateContentPost: {
    name: "generateContentPost",
    description: "Wygeneruj materiał Content Hub (strona, Facebook, Instagram)",
    riskLevel: "medium",
    permissions: ["content:create"],
    requiresApproval: true,
  },
  proposeContentPublication: {
    name: "proposeContentPublication",
    description: "Zaproponuj publikację materiału (wymaga zatwierdzenia przez człowieka)",
    riskLevel: "medium",
    permissions: ["content:publish"],
    requiresApproval: true,
  },
  getLeagueInsights: {
    name: "getLeagueInsights",
    description: "Analiza tabeli ligowej, serii wyników i terminarza (League Hub)",
    riskLevel: "low",
    permissions: ["league:read"],
    requiresApproval: false,
  },
};

export function getToolDefinition(name: string): AiToolDefinition | null {
  return AI_TOOL_REGISTRY[name as AiToolName] ?? null;
}

export function getToolRiskLevel(name: string): AiRiskLevel {
  return getToolDefinition(name)?.riskLevel ?? "high";
}

export function toolRequiresApproval(name: string): boolean {
  const def = getToolDefinition(name);
  if (!def) return true;
  if (def.riskLevel === "high") return true;
  return def.requiresApproval;
}

export function getToolPermissions(name: string): Permission[] {
  return getToolDefinition(name)?.permissions ?? [];
}

export function getOpenAiToolSchemas() {
  return Object.values(AI_TOOL_REGISTRY).map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Parametry zapytania w JSON lub tekst" },
        },
        additionalProperties: true,
      },
    },
  }));
}
