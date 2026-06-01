"use client";

import { useActionState, useTransition } from "react";

import {
  approveContentPostAction,
  publishContentPostAction,
  queueChannelVariantAction,
  rejectContentPostAction,
  submitContentForApprovalAction,
  updateChannelVariantAction,
  type ContentActionState,
} from "@/features/content/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONTENT_APPROVAL_ACTION_LABELS,
  CONTENT_CHANNEL_LABELS,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  type ContentApproval,
  type ContentChannelVariant,
  type ContentPost,
} from "@/types/content";

const emptyState: ContentActionState = {};

export function ContentPostDetailView({
  post,
  variants,
  approvals,
  canManage,
  canPublish,
}: {
  post: ContentPost;
  variants: ContentChannelVariant[];
  approvals: ContentApproval[];
  canManage: boolean;
  canPublish: boolean;
}) {
  const [variantState, variantAction, variantPending] = useActionState(updateChannelVariantAction, emptyState);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{post.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="text-muted-foreground">Typ:</span> {CONTENT_TYPE_LABELS[post.contentType]}
          </p>
          <p>
            <span className="text-muted-foreground">Status:</span> {CONTENT_STATUS_LABELS[post.status]}
          </p>
          {post.summary ? <p className="text-muted-foreground">{post.summary}</p> : null}
          {post.bodyWebsite ? (
            <div className="rounded-lg border bg-muted/20 p-4 whitespace-pre-wrap">{post.bodyWebsite}</div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-2">
            {post.status === "draft" ? (
              <Button
                size="sm"
                disabled={pending}
                onClick={() => start(() => void submitContentForApprovalAction(post.id))}
              >
                Wyślij do akceptacji
              </Button>
            ) : null}
            {canPublish && post.status === "pending_approval" ? (
              <>
                <Button size="sm" disabled={pending} onClick={() => start(() => void approveContentPostAction(post.id))}>
                  Akceptuj
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => start(() => void rejectContentPostAction(post.id, "Wymaga poprawek"))}
                >
                  Odrzuć
                </Button>
              </>
            ) : null}
            {canPublish && ["approved", "pending_approval"].includes(post.status) ? (
              <>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => start(() => void publishContentPostAction(post.id, true))}
                >
                  Opublikuj (+ strona)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => start(() => void publishContentPostAction(post.id, false))}
                >
                  Opublikuj (Hub)
                </Button>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Warianty kanałów</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {variants.map((variant) => (
            <form key={variant.id} action={variantAction} className="space-y-2 rounded-lg border p-4">
              <input type="hidden" name="variantId" value={variant.id} />
              <p className="font-medium">
                {CONTENT_CHANNEL_LABELS[variant.channel]} · {variant.status}
              </p>
              <div className="space-y-2">
                <Label>Tytuł</Label>
                <Input name="title" defaultValue={variant.title ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>Treść</Label>
                <textarea
                  name="body"
                  rows={4}
                  defaultValue={variant.body}
                  className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
                />
              </div>
              {canManage && variant.channel !== "website" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => start(() => void queueChannelVariantAction(post.id, variant.channel))}
                >
                  Dodaj do kolejki
                </Button>
              ) : null}
              <Button type="submit" size="sm" disabled={variantPending}>
                Zapisz wariant
              </Button>
            </form>
          ))}
          {variantState.error ? <p className="text-sm text-destructive">{variantState.error}</p> : null}
          {variantState.success ? <p className="text-sm text-green-700">{variantState.success}</p> : null}
        </CardContent>
      </Card>

      {approvals.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audyt treści</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {approvals.map((entry) => (
                <li key={entry.id} className="rounded border px-3 py-2">
                  {CONTENT_APPROVAL_ACTION_LABELS[entry.action]} ·{" "}
                  {new Date(entry.createdAt).toLocaleString("pl-PL")}
                  {entry.note ? ` — ${entry.note}` : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
