"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { uploadFinanceDocument } from "@/features/finance/actions";
import {
  FINANCE_DOCUMENT_TYPE_LABELS,
  formatMoney,
} from "@/lib/finance/constants";
import type { FinanceDocument } from "@/types/finance";
import { FINANCE_DOCUMENT_TYPES } from "@/types/finance";

export function FinanceDocumentsPanel({
  documents,
  canManage,
}: {
  documents: FinanceDocument[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(uploadFinanceDocument, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} encType="multipart/form-data" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Dodaj dokument</h2>
          <input name="title" placeholder="Tytuł" required className="border-input min-h-[44px] rounded-md border px-3 sm:col-span-2" />
          <select name="documentType" className="border-input min-h-[44px] rounded-md border px-3">
            {FINANCE_DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>{FINANCE_DOCUMENT_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input name="issueDate" type="date" className="border-input min-h-[44px] rounded-md border px-3" />
          <input name="amount" type="number" step="0.01" placeholder="Kwota (opcjonalnie)" className="border-input min-h-[44px] rounded-md border px-3" />
          <input type="file" name="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="sm:col-span-2 text-sm" />
          <Button type="submit" disabled={pending}>Prześlij</Button>
        </form>
      ) : null}

      <ul className="space-y-2">
        {documents.map((doc) => (
          <li key={doc.id} className="flex flex-col gap-1 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{doc.title}</p>
              <p className="text-sm text-muted-foreground">
                {FINANCE_DOCUMENT_TYPE_LABELS[doc.documentType]} · {doc.fileName}
                {doc.amount != null ? ` · ${formatMoney(doc.amount)}` : ""}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">{doc.issueDate ?? doc.createdAt.slice(0, 10)}</p>
          </li>
        ))}
      </ul>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
    </div>
  );
}
