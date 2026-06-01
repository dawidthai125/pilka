"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";

import { executeAgentCommand, type AiManagerActionState } from "@/features/ai-manager/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialState: AiManagerActionState = {};

const QUICK_COMMANDS = [
  "Pokaż zawodników z frekwencją poniżej 60%",
  "Wygeneruj raport dla prezesa",
  "Przypomnij wszystkim o jutrzejszym treningu",
  "Znajdź sponsorów bez kontaktu od 30 dni",
  "Pokaż zawodników z wygasającymi badaniami",
];

export function AgentCommandForm({
  compact = false,
  onSuccess,
}: {
  compact?: boolean;
  onSuccess?: () => void;
}) {
  const [command, setCommand] = useState("");
  const [state, formAction, pending] = useActionState(executeAgentCommand, initialState);

  useEffect(() => {
    if (state.success) {
      setCommand("");
      onSuccess?.();
    }
  }, [state.success, onSuccess]);

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      <form action={formAction} className="flex gap-2">
        <Input
          name="command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Wpisz polecenie dla agenta…"
          className="flex-1"
          disabled={pending}
        />
        <Button type="submit" disabled={pending || !command.trim()} size={compact ? "sm" : "default"}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {!compact ? <span className="ml-2 hidden sm:inline">Wykonaj</span> : null}
        </Button>
      </form>

      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">{state.success}</p>
      ) : null}

      {!compact ? (
        <div className="flex flex-wrap gap-2">
          {QUICK_COMMANDS.map((item) => (
            <button
              key={item}
              type="button"
              className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
              onClick={() => setCommand(item)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
