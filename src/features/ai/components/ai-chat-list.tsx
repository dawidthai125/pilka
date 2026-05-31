"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pin, PinOff, Search } from "lucide-react";
import { useActionState, useEffect } from "react";

import {
  createAiConversation,
  toggleAiConversationPin,
  type AiActionState,
} from "@/features/ai/actions";
import type { AiConversation } from "@/types/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: AiActionState = {};

export function AiChatList({ conversations }: { conversations: AiConversation[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const [createState, createAction, createPending] = useActionState(createAiConversation, initialState);

  useEffect(() => {
    if (createState.id) router.push(`/ai/chat/${createState.id}`);
  }, [createState.id, router]);

  function setSearch(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("q", value);
    else params.delete("q");
    router.push(`/ai/chat?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Chat AI</h1>
          <p className="text-sm text-muted-foreground">Historia rozmów, wyszukiwanie i przypinanie.</p>
        </div>
        <form action={createAction}>
          <Button type="submit" disabled={createPending}>Nowa rozmowa</Button>
        </form>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={search}
          placeholder="Szukaj rozmów..."
          className="pl-9"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {createState.error ? <p className="text-sm text-destructive">{createState.error}</p> : null}

      <div className="space-y-2">
        {conversations.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
            Brak rozmów. Rozpocznij nową konwersację.
          </p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <Link href={`/ai/chat/${conv.id}`} className="min-w-0 flex-1 hover:underline">
                <p className="flex items-center gap-2 font-medium">
                  {conv.isPinned ? <Pin className="size-3.5 shrink-0" /> : null}
                  {conv.title}
                </p>
                {conv.preview ? (
                  <p className="truncate text-sm text-muted-foreground">{conv.preview}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {new Date(conv.updatedAt).toLocaleString("pl-PL")}
                </p>
              </Link>
              <PinToggle conversationId={conv.id} pinned={conv.isPinned} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PinToggle({ conversationId, pinned }: { conversationId: string; pinned: boolean }) {
  const action = toggleAiConversationPin.bind(null, conversationId);
  const [, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="pinned" value={pinned ? "false" : "true"} />
      <Button type="submit" size="sm" variant="outline" disabled={pending} className="w-full sm:w-auto">
        {pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
        {pinned ? "Odepnij" : "Przypnij"}
      </Button>
    </form>
  );
}
