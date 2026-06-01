import type { LucideIcon } from "lucide-react";
import { Bot, Megaphone, MessageCircle, MessagesSquare, Users } from "lucide-react";

export const COMMUNICATION_NAV: {
  href: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { href: "/communication", label: "Przegląd", icon: MessagesSquare },
  { href: "/communication/announcements", label: "Ogłoszenia", icon: Megaphone },
  { href: "/communication/coach", label: "Komunikaty trenera", icon: Users },
  { href: "/communication/chats", label: "Czaty", icon: MessageCircle },
  { href: "/communication/ai", label: "AI Assistant", icon: Bot },
];

export const REVALIDATE_COMMUNICATION_PATHS = [
  "/communication",
  "/communication/announcements",
  "/communication/coach",
  "/communication/chats",
  "/notifications",
];
