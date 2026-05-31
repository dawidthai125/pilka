"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";

import { sendAiMessage, type AiActionState } from "@/features/ai/actions";
import type { AiConversationDetail } from "@/types/ai";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialState: AiActionState = {};

export function AiChatView({ data }: { data: AiConversationDetail }) {
  const action = sendAiMessage.bind(null, data.conversation.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data.messages.length, state.success]);

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col gap-4 md:h-[calc(100vh-10rem)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{data.conversation.title}</h1>
          <Link href="/ai/chat" className={cn(buttonVariants({ variant: "link", size: "sm" }), "px-0")}>
            ← Wróć do listy
          </Link>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border p-3 sm:p-4">
        {data.messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap sm:max-w-[75%]",
              msg.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-muted",
            )}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        {state.error ? <p className="text-sm text-destructive sm:col-span-full">{state.error}</p> : null}
        <textarea
          name="content"
          rows={2}
          required
          placeholder="Zadaj pytanie o dane klubu..."
          className="border-input bg-background min-h-[44px] flex-1 rounded-md border px-3 py-2 text-sm shadow-xs"
        />
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          Wyślij
        </Button>
      </form>
    </div>
  );
}
