"use client";

import { useState, type FormEvent } from "react";

import { updateAccount } from "@/actions/update-account";
import { Button } from "@/components/ui/button";
import { inputClass } from "@/lib/form-ui";

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
        <label className="block text-sm font-medium text-foreground">Email</label>
        <input type="email" value={email} disabled className={`${inputClass} mt-1 opacity-60`} />
        <p className="mt-1 text-xs text-muted-foreground">Contact support to change your sign-in email.</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            setSaved(false);
          }}
          disabled={pending}
          className={`${inputClass} mt-1`}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setSaved(false);
          }}
          disabled={pending}
          className={`${inputClass} mt-1`}
        />
      </div>

      {error && (
        <div role="alert" className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3">
          <p className="text-sm font-medium text-destructive">{error}</p>
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

      <div className="flex items-center justify-end gap-3">
        {saved && <p className="text-sm text-muted-foreground">Saved.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
