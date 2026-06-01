"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSiteUrl, isPublicRegistrationEnabled } from "@/config/env";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
};

export async function signInWithPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Podaj email i hasło." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Nieprawidłowy email lub hasło." };
  }

  redirect("/dashboard");
}

export async function signUpWithPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isPublicRegistrationEnabled()) {
    return { error: "Rejestracja nowych kont jest wyłączona. Skontaktuj się z zarządem klubu." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    return { error: "Wypełnij wszystkie pola." };
  }

  if (password.length < 8) {
    return { error: "Hasło musi mieć co najmniej 8 znaków." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: "Nie udało się utworzyć konta. Spróbuj ponownie później." };
  }

  return {
    success: "Konto utworzone. Sprawdź skrzynkę email, aby potwierdzić rejestrację.",
  };
}

export async function requestPasswordReset(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Podaj adres email." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/reset-password`,
  });

  if (error) {
    return {
      success: "Jeśli konto istnieje, wysłaliśmy link do resetu hasła na podany adres email.",
    };
  }

  return {
    success: "Jeśli konto istnieje, wysłaliśmy link do resetu hasła na podany adres email.",
  };
}

export async function updatePassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!password || password.length < 8) {
    return { error: "Hasło musi mieć co najmniej 8 znaków." };
  }

  if (password !== confirm) {
    return { error: "Hasła nie są identyczne." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Nie udało się zaktualizować hasła. Spróbuj ponownie." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateProfile(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Sesja wygasła." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName || null,
      phone: phone || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Nie udało się zaktualizować profilu." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  return { success: "Profil zaktualizowany." };
}
