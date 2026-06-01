"use client";

import { useActionState } from "react";

import { upsertInjuryCategoryAction, type InjuryActionState } from "@/features/injuries/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InjuryCategoryRow } from "@/types/injuries";

export function InjuryCategoriesPanel({ categories }: { categories: InjuryCategoryRow[] }) {
  const [state, formAction, pending] = useActionState<InjuryActionState, FormData>(
    upsertInjuryCategoryAction,
    {},
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kategorie urazów</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex justify-between rounded-md border px-3 py-2 text-sm">
              <span>{c.name}</span>
              <span className="text-muted-foreground">{c.slug}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dodaj kategorię</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Nazwa</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" name="slug" required placeholder="np. muscle" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Kolejność</Label>
              <Input id="sortOrder" name="sortOrder" type="number" defaultValue={10} />
            </div>
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
            <Button type="submit" size="sm" disabled={pending}>
              Zapisz kategorię
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
