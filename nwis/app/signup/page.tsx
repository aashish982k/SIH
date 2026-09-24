"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/appStore";

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || "Unable to create account");
      if (!payload.data?.user) throw new Error("Registration response did not include a user");
      setAuth(payload.data.user, payload.data.token);
      router.push("/dashboard");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create account"); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Create engineer account</h1>
      <p className="mt-1 text-sm text-muted-foreground">All self-serve accounts are registered as engineers.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {(["name", "email", "password"] as const).map((field) => (
          <label key={field} className="block text-sm font-medium capitalize">
            {field}
            <input required minLength={field === "password" ? 8 : 2} type={field === "password" ? "password" : field === "email" ? "email" : "text"} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="mt-1 w-full rounded-md border bg-background px-3 py-2" />
          </label>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button disabled={busy} className="w-full rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground">{busy ? "Creating…" : "Create account"}</button>
      </form>
    </main>
  );
}
