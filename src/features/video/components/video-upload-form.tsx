"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  abortVideoUploadAction,
  completeVideoUploadAction,
  initVideoUploadAction,
  type VideoActionState,
} from "@/features/video/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_VIDEO_MAX_UPLOAD_MB, VIDEO_STORAGE_BUCKET, validateVideoUpload } from "@/lib/video/uploads";
import { VIDEO_CATEGORIES, VIDEO_CATEGORY_LABELS } from "@/types/video";

export function VideoUploadForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setUploadProgress(null);
    setPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file || file.size === 0) {
      setError("Wybierz plik wideo.");
      setPending(false);
      return;
    }

    const validationError = validateVideoUpload(file);
    if (validationError) {
      setError(validationError);
      setPending(false);
      return;
    }

    formData.set("fileName", file.name);
    formData.set("mimeType", file.type || "video/mp4");
    formData.set("fileSize", String(file.size));

    let initResult: VideoActionState;
    try {
      initResult = await initVideoUploadAction({}, formData);
    } catch {
      setError("Nie udało się rozpocząć uploadu.");
      setPending(false);
      return;
    }

    if (initResult.error || !initResult.videoId || !initResult.storagePath) {
      setError(initResult.error ?? "Nie udało się utworzyć nagrania.");
      setPending(false);
      return;
    }

    setUploadProgress("Przesyłanie pliku do storage…");

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from(VIDEO_STORAGE_BUCKET)
      .upload(initResult.storagePath, file, {
        contentType: file.type || "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      await abortVideoUploadAction(initResult.videoId);
      setError(`Upload nie powiódł się: ${uploadError.message}`);
      setPending(false);
      setUploadProgress(null);
      return;
    }

    setUploadProgress("Uruchamianie analizy AI…");

    const completeResult = await completeVideoUploadAction(
      initResult.videoId,
      initResult.storagePath,
    );
    if (completeResult.error) {
      setError(completeResult.error);
      setPending(false);
      setUploadProgress(null);
      return;
    }

    setSuccess(completeResult.success ?? "Nagranie dodane.");
    setUploadProgress(null);
    setPending(false);
    form.reset();
    router.push(`/video/${initResult.videoId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-5 rounded-xl border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Upload wideo</h2>
        <p className="text-sm text-muted-foreground">
          Formaty: MP4, MOV, AVI, MKV. Maks. {DEFAULT_VIDEO_MAX_UPLOAD_MB} MB. Plik trafia bezpośrednio do
          Supabase Storage (bez limitu body server action).
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
      {uploadProgress ? <p className="text-sm text-muted-foreground">{uploadProgress}</p> : null}

      <div className="space-y-2">
        <Label htmlFor="title">Tytuł</Label>
        <Input id="title" name="title" required placeholder="Np. Mecz ligowy — Piorun vs …" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategoria</Label>
        <select
          id="category"
          name="category"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          defaultValue="match"
        >
          {VIDEO_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {VIDEO_CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Opis (opcjonalnie)</Label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="opponentName">Przeciwnik (analiza)</Label>
        <Input id="opponentName" name="opponentName" placeholder="Tylko dla kategorii analiza przeciwnika" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Plik wideo</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.mov,.avi,.mkv"
          required
        />
      </div>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Przesyłanie…" : "Dodaj i analizuj"}
      </Button>
    </form>
  );
}
