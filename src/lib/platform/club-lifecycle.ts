import { connectServerDb } from "@/lib/db/server-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildPlatformAuditEntry, logPlatformAudit } from "@/lib/platform/audit";
import {
  platformAppendClubAudit,
  platformSetClubStatus,
} from "@/lib/platform/club-db-writes";

export type ClubLifecycleActor = {
  id: string;
  email: string;
};

export type ArchiveClubInput = {
  clubId: string;
  actor: ClubLifecycleActor;
};

export type ArchiveClubResult = {
  clubId: string;
  slug: string;
  publicName: string;
  noop: boolean;
};

export type RestoreClubResult = ArchiveClubResult;

export type ResendOwnerInviteResult = {
  clubId: string;
  ownerEmail: string;
};

async function withClubStatusTransaction<T>(
  clubId: string,
  run: (client: Awaited<ReturnType<typeof connectServerDb>>) => Promise<T>,
): Promise<T> {
  const client = await connectServerDb();
  try {
    await client.query("BEGIN");
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

export async function archiveClub(input: ArchiveClubInput): Promise<ArchiveClubResult> {
  const admin = createAdminClient();
  const { data: club, error } = await admin
    .from("clubs")
    .select("id, slug, public_name, status")
    .eq("id", input.clubId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!club) throw new Error("Klub nie istnieje.");

  const status = String(club.status);
  if (status === "archived") {
    return {
      clubId: input.clubId,
      slug: String(club.slug),
      publicName: String(club.public_name),
      noop: true,
    };
  }

  if (status !== "active") {
    throw new Error(`Archiwizacja dostępna tylko dla klubu aktywnego (obecny status: ${status}).`);
  }

  const auditEntry = buildPlatformAuditEntry("club_archived", input.actor, {
    clubId: input.clubId,
    slug: String(club.slug),
    previousStatus: status,
  });

  const result = await withClubStatusTransaction(input.clubId, async (client) =>
    platformSetClubStatus(client, input.clubId, "archived", auditEntry),
  );

  logPlatformAudit(auditEntry);
  return {
    clubId: input.clubId,
    slug: result.slug,
    publicName: result.publicName,
    noop: result.noop,
  };
}

export async function restoreClub(input: ArchiveClubInput): Promise<RestoreClubResult> {
  const admin = createAdminClient();
  const { data: club, error } = await admin
    .from("clubs")
    .select("id, slug, public_name, status")
    .eq("id", input.clubId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!club) throw new Error("Klub nie istnieje.");

  const status = String(club.status);
  if (status === "onboarding") {
    return {
      clubId: input.clubId,
      slug: String(club.slug),
      publicName: String(club.public_name),
      noop: true,
    };
  }

  if (status !== "archived") {
    throw new Error(`Przywrócenie dostępne tylko dla klubu zarchiwizowanego (obecny status: ${status}).`);
  }

  const auditEntry = buildPlatformAuditEntry("club_restored", input.actor, {
    clubId: input.clubId,
    slug: String(club.slug),
    previousStatus: status,
    targetStatus: "onboarding",
  });

  const result = await withClubStatusTransaction(input.clubId, async (client) =>
    platformSetClubStatus(client, input.clubId, "onboarding", auditEntry),
  );

  logPlatformAudit(auditEntry);
  return {
    clubId: input.clubId,
    slug: result.slug,
    publicName: result.publicName,
    noop: result.noop,
  };
}

export async function resendOwnerInvite(input: {
  clubId: string;
  actor: ClubLifecycleActor;
}): Promise<ResendOwnerInviteResult> {
  const admin = createAdminClient();

  const { data: membership, error: membershipError } = await admin
    .from("club_memberships")
    .select("user_id, status")
    .eq("club_id", input.clubId)
    .eq("role", "owner")
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership?.user_id) {
    throw new Error("Brak przypisanego właściciela — utwórz ownera przy tworzeniu klubu.");
  }

  if (membership.status === "active") {
    throw new Error("Właściciel ma już status active — zaproszenie nie jest wymagane.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email")
    .eq("id", membership.user_id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  const ownerEmail = profile?.email?.trim();
  if (!ownerEmail) {
    throw new Error("Brak adresu e-mail właściciela w profilu.");
  }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(ownerEmail, {
    data: { full_name: "Club Owner" },
  });

  if (inviteError) {
    throw new Error(
      `Nie udało się ponowić zaproszenia: ${inviteError.message}. ` +
        "Supabase Auth może blokować ponowne invite — owner musi użyć pierwotnego linku lub reset hasła.",
    );
  }

  const auditEntry = buildPlatformAuditEntry("owner_invite_resent", input.actor, {
    clubId: input.clubId,
    ownerEmail,
    previousOwnerStatus: membership.status,
  });

  const client = await connectServerDb();
  try {
    await platformAppendClubAudit(client, input.clubId, auditEntry);
  } finally {
    await client.end();
  }

  logPlatformAudit(auditEntry);
  return { clubId: input.clubId, ownerEmail };
}
