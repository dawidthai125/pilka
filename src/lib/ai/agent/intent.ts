import type { AiToolName } from "@/types/ai-agent";

export type ParsedToolCall = {
  toolName: AiToolName;
  input: Record<string, unknown>;
};

function includesAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/** Rule-based intent parser — fallback gdy brak OpenAI tool calling. */
export function parseCommandToTools(command: string): ParsedToolCall[] {
  const text = command.toLowerCase().trim();

  if (includesAny(text, ["frekwenc", "poniżej 60", "ponizej 60", "niska frekwenc"])) {
    const match = text.match(/(\d+)\s*%/);
    return [{ toolName: "getPlayers", input: { minAttendanceRate: match ? Number(match[1]) : 60 } }];
  }

  if (includesAny(text, ["wygasaj", "badan", "dokument"])) {
    return [{ toolName: "getDocuments", input: { withinDays: 30 } }];
  }

  if (includesAny(text, ["sponsor"]) && includesAny(text, ["30 dni", "kontakt", "bez kontaktu"])) {
    return [{ toolName: "getSponsors", input: {} }];
  }

  if (includesAny(text, ["składk", "skladk", "zaleg"])) {
    return [{ toolName: "getFinances", input: {} }];
  }

  if (includesAny(text, ["raport"]) && includesAny(text, ["prezes", "zarząd", "zarzad"])) {
    return [{ toolName: "generateReport", input: { category: "management", title: "Raport dla prezesa" } }];
  }

  if (includesAny(text, ["raport"])) {
    return [{ toolName: "generateReport", input: { category: "management" } }];
  }

  if (includesAny(text, ["przypomn"]) && includesAny(text, ["trening", "jutr"])) {
    return [
      {
        toolName: "createNotification",
        input: {
          title: "Przypomnienie o treningu",
          body: "Przypominamy o jutrzejszym treningu. Potwierdź obecność w aplikacji.",
          href: "/training",
        },
      },
    ];
  }

  if (includesAny(text, ["utwórz trening", "utworz trening", "dodaj trening", "nowy trening"])) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return [
      {
        toolName: "createTraining",
        input: {
          name: "Trening",
          trainingDate: tomorrow.toISOString().slice(0, 10),
          startTime: "18:00",
          endTime: "19:30",
          location: "Boisko Wawrzeńczyce",
        },
      },
    ];
  }

  if (includesAny(text, ["utwórz mecz", "utworz mecz", "dodaj mecz", "nowy mecz"])) {
    return [{ toolName: "createMatch", input: {} }];
  }

  if (includesAny(text, ["mecz", "wynik", "terminarz"])) {
    return [{ toolName: "getMatches", input: {} }];
  }

  if (includesAny(text, ["trening", "plan trening"])) {
    return [{ toolName: "getTrainings", input: {} }];
  }

  if (includesAny(text, ["zawodnik", "drużyn", "druzyn", "lista zawodnik"])) {
    return [{ toolName: "getPlayers", input: {} }];
  }

  if (includesAny(text, ["magazyn", "sprzęt", "sprzet"])) {
    return [{ toolName: "getInventory", input: {} }];
  }

  if (includesAny(text, ["aktualno", "news", "post"])) {
    return [{ toolName: "generateNews", input: { topic: command } }];
  }

  return [];
}

export function summarizeToolResult(toolName: AiToolName, result: unknown): string {
  if (!result || typeof result !== "object") return "Akcja zakończona.";
  const data = result as Record<string, unknown>;

  if (data.error) return String(data.error);

  switch (toolName) {
    case "getPlayers": {
      const count = Array.isArray(data.lowAttendance) ? data.lowAttendance.length : 0;
      return count > 0
        ? `Znaleziono ${count} zawodników z niską frekwencją.`
        : "Brak zawodników spełniających kryteria.";
    }
    case "getDocuments":
      return `Wygasających dokumentów: ${data.expiringCount ?? 0}.`;
    case "getSponsors":
      return `Sponsorzy bez kontaktu (30 dni): ${Array.isArray(data.noContact30Days) ? data.noContact30Days.length : 0}.`;
    case "getFinances":
      return `Zaległe składki: ${(data.summary as { overdueFeesCount?: number })?.overdueFeesCount ?? 0}.`;
    case "generateReport":
      return "Raport wygenerowany jako szkic w Centrum raportów AI.";
    case "createTraining":
    case "createMatch":
      return "Operacja wykonana pomyślnie.";
    case "createNotification":
      return `Wysłano powiadomienie do ${(data as { recipients?: number }).recipients ?? 0} użytkowników.`;
    default:
      return "Zadanie wykonane.";
  }
}
