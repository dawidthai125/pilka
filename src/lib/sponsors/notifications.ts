import { SPONSOR_CONTRACT_REMINDER_DAYS } from "@/lib/sponsors/constants";

export function contractReminderScheduledAt(endDate: string, daysBefore: number): Date {
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return new Date(end.getTime() - daysBefore * 24 * 60 * 60 * 1000);
}

export function isContractReminderDue(endDate: string, daysBefore: number, now = new Date()): boolean {
  const scheduled = contractReminderScheduledAt(endDate, daysBefore);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return scheduled.getTime() <= now.getTime() && end.getTime() >= now.getTime();
}

export function buildContractReminderCopy(
  contractName: string,
  sponsorName: string,
  endDate: string,
  daysBefore: number,
): { title: string; body: string } {
  return {
    title: "Przypomnienie o umowie sponsorskiej",
    body: `Umowa „${contractName}” (${sponsorName}) wygasa ${endDate} — pozostało ${daysBefore} dni.`,
  };
}

export { SPONSOR_CONTRACT_REMINDER_DAYS };
