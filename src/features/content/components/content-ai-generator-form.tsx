"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { generateContentWithAiAction, type ContentActionState } from "@/features/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ContentActionState = {};

const PROMPT_EXAMPLES = [
  "Wygeneruj podsumowanie meczu",
  "Napisz zapowiedź spotkania",
  "Przygotuj post dla sponsorów",
  "Przygotuj relację z turnieju",
  "Stwórz komunikat organizacyjny",
];

export function ContentAiGeneratorForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(async (prev: ContentActionState, formData: FormData) => {
    const result = await generateContentWithAiAction(prev, formData);
    if (result.postId && !result.error) {
      router.push(`/content/posts/${result.postId}`);
    }
    return result;
  }, initialState);

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-5 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">AI Content Generator</h2>
        <p className="text-sm text-muted-foreground">
          Generuje wersje na stronę, Facebook i Instagram. Publikacja wymaga zatwierdzenia.
        </p>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}

      <div className="flex flex-wrap gap-2">
        {PROMPT_EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="rounded-full border px-3 py-1 text-xs hover:bg-muted"
            onClick={(event) => {
              const form = event.currentTarget.closest("form");
              const input = form?.querySelector<HTMLTextAreaElement>('textarea[name="prompt"]');
              if (input) input.value = example;
            }}
          >
            {example}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">Polecenie</Label>
        <textarea
          id="prompt"
          name="prompt"
          rows={4}
          required
          placeholder="Np. Wygeneruj podsumowanie meczu Piorun 3:1 Orzeł"
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="matchId">ID meczu (opcj.)</Label>
          <Input id="matchId" name="matchId" placeholder="UUID meczu" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="videoId">ID wideo (opcj.)</Label>
          <Input id="videoId" name="videoId" placeholder="Video Center" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sponsorId">ID sponsora (opcj.)</Label>
          <Input id="sponsorId" name="sponsorId" placeholder="Sponsor" />
        </div>
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Generowanie…" : "Generuj materiały AI"}
      </Button>
    </form>
  );
}
