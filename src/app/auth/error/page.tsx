export default function AuthErrorPage() {
  return (
    <div className="rounded-lg border border-destructive/30 bg-card p-6 text-card-foreground">
      <h1 className="text-xl font-semibold">Błąd autoryzacji</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Nie udało się zakończyć procesu logowania. Spróbuj ponownie później.
      </p>
    </div>
  );
}
