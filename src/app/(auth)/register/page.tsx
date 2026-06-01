import { redirect } from "next/navigation";

import { isPublicRegistrationEnabled } from "@/config/env";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  if (!isPublicRegistrationEnabled()) {
    redirect("/login?error=registration_disabled");
  }

  return <RegisterForm />;
}
