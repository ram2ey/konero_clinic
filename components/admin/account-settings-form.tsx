"use client";

import { useState, type FormEvent } from "react";

import { updateAccount } from "@/actions/update-account";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/lib/form-ui";

import { CheckCircle2, Mail, Phone as PhoneIcon, User } from "lucide-react";

export function AccountSettingsForm({
  initialFullName,
  initialPhone,
  email,
}: {
  initialFullName: string;
  initialPhone: string;
  email: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors(null);
    setSaved(false);
    setPending(true);

    const result = await updateAccount({ fullName, phone: phone.trim() || undefined });
    setPending(false);

    if (result.status !== "success") {
      setError(result.message ?? "Failed to save changes.");
      setFieldErrors(result.fieldErrors ?? null);
      return;
    }

    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Email address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input type="email" value={email} disabled className={`${inputClass} pl-10 opacity-60`} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Sign-in email is managed via administrative security.</p>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Doctor Full Name
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaved(false);
            }}
            disabled={pending}
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Direct Phone Number
        </label>
        <div className="relative">
          <PhoneIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setSaved(false);
            }}
            disabled={pending}
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5">
          <p className="text-xs font-semibold text-destructive">{error}</p>
          {fieldErrors && (
            <ul className="list-inside list-disc text-xs text-destructive">
              {Object.entries(fieldErrors).map(([field, messages]) => (
                <li key={field}>
                  {field}: {messages.join(", ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-4" />
          <span>Profile changes successfully updated.</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="submit" disabled={pending} className="shadow-xs shadow-primary/25">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
