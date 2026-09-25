"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppStore } from "@/store/appStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Droplets, Lock, AlertTriangle, Eye, EyeOff } from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email").or(z.literal("")).optional(),
  username: z.string().min(1, "Username is required").or(z.literal("")).optional(),
  password: z.string().min(1, "Password is required"),
}).superRefine((val, ctx) => {
  if (!val.email && !val.username) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Email is required",
      path: ["email"],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Username is required",
      path: ["username"],
    });
  }
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);
  const [mode, setMode] = useState<"engineer" | "admin">("engineer");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "admin"
          ? { username: data.username, password: data.password }
          : { email: data.email, password: data.password }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || "Invalid credentials");
      const user = payload.data?.user;
      const token = payload.data?.token;
      if (!user) throw new Error("Login response did not include a user");
      setAuth(user, token);
      router.push(user?.role === "administrator" ? "/admin" : "/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign in");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-64px-80px)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Droplets aria-hidden="true" className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Sign in to NWIS</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access drilling intelligence and administration tools
          </p>
        </div>

        <Card className="border-border/60 shadow-lg shadow-black/40">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 mb-5">
              <button type="button" onClick={() => { setMode("engineer"); setError(""); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${mode === "engineer" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Engineer</button>
              <button type="button" onClick={() => { setMode("admin"); setError(""); }} className={`rounded-md px-3 py-2 text-xs font-semibold ${mode === "admin" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Admin</button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <Label htmlFor={mode === "admin" ? "username" : "email"} className="text-xs font-medium">
                  {mode === "admin" ? "Admin username" : "Engineer email"}
                </Label>
                <Input
                  id={mode === "admin" ? "username" : "email"}
                  type={mode === "admin" ? "text" : "email"}
                  autoComplete={mode === "admin" ? "username" : "email"}
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={mode === "admin" ? "admin" : "engineer@example.com"}
                  className="mt-1.5 h-10"
                  aria-invalid={mode === "admin" ? !!errors.username : !!errors.email}
                  {...register(mode === "admin" ? "username" : "email")}
                />
                {(mode === "admin" ? errors.username : errors.email) && (
                  <p className="text-xs text-destructive mt-1">
                    {(mode === "admin" ? errors.username : errors.email)?.message}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="password" className="text-xs font-medium">
                  Password
                </Label>
                <div className="relative mt-1.5">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="h-10 pr-10"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    aria-pressed={showPw}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded outline-none"
                  >
                    {showPw ? (
                      <EyeOff aria-hidden="true" className="w-4 h-4" />
                    ) : (
                      <Eye aria-hidden="true" className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-xs text-destructive mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div aria-live="polite">
                {error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle aria-hidden="true" className="w-3.5 h-3.5" />
                    <AlertDescription className="text-xs">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-10 gap-2"
                disabled={loading}
              >
                <Lock aria-hidden="true" className="w-4 h-4" />
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          {mode === "engineer" ? <>Need an account? <a className="text-primary hover:underline" href="/signup">Create engineer account</a></> : "Admin access uses the username admin."}
        </p>
      </motion.div>
    </div>
  );
}
