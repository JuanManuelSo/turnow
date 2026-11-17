import { z } from "zod";
import { locations, type LocationId } from "@/config/business";

export const loginEmailSchema = z
  .string()
  .trim()
  .min(1, "Ingresá tu email.")
  .max(254, "El email no puede superar 254 caracteres.")
  .pipe(z.email({ error: "Ingresá un email válido." }));

export const loginPasswordSchema = z
  .string()
  .min(1, "Ingresá tu contraseña.")
  .max(256, "La contraseña no puede superar 256 caracteres.");

export const loginLocationSchema = z.custom<LocationId>(
  (value) =>
    typeof value === "string" &&
    locations.some((location) => location.id === value),
  { message: "Elegí una sede válida." },
);

const credentials = { email: loginEmailSchema, password: loginPasswordSchema };

export const loginFormSchema = z.discriminatedUnion("accountType", [
  z.object({ ...credentials, accountType: z.literal("owner") }),
  z.object({
    ...credentials,
    accountType: z.literal("location"),
    location: loginLocationSchema,
  }),
]);

export const recoveryFormSchema = z.object({ email: loginEmailSchema });

export type AuthFieldName = "email" | "password" | "accountType" | "location";
export type AuthFieldErrors = Partial<Record<AuthFieldName, string>>;

export function fieldErrorsFromIssues(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): AuthFieldErrors {
  const fieldErrors: AuthFieldErrors = {};
  const fields = new Set<AuthFieldName>([
    "email",
    "password",
    "accountType",
    "location",
  ]);

  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && fields.has(field as AuthFieldName)) {
      fieldErrors[field as AuthFieldName] ??= issue.message;
    }
  }

  return fieldErrors;
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
