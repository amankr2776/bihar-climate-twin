import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import { ShieldCheck, Loader2, Info } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · VARUNA" },
      { name: "description", content: "Sign in to VARUNA — Bihar's block-level climate digital twin." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email({ message: "Enter a valid email" }).max(255);
const passwordSchema = z.string().min(6, { message: "At least 6 characters" }).max(128);
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{9,14}$/, { message: "Enter phone in +91XXXXXXXXXX format" });

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] font-display text-lg font-black text-background">
            V
          </div>
          <div className="font-display text-xl font-bold tracking-tight bg-gradient-to-r from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] bg-clip-text text-transparent">
            VARUNA
          </div>
        </Link>

        <div className="rounded-xl border border-border bg-panel p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[color:var(--brand-cyan)]" />
            <h1 className="font-display text-lg font-semibold">
              {mode === "in" ? "Sign in to VARUNA" : "Create an account"}
            </h1>
          </div>

          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone OTP</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-4">
              <EmailForm mode={mode} busy={busy} setBusy={setBusy} onDone={() => navigate({ to: "/dashboard" })} />
              <button
                type="button"
                onClick={() => setMode(mode === "in" ? "up" : "in")}
                className="mt-3 text-xs text-muted-foreground hover:text-foreground"
              >
                {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
              </button>
            </TabsContent>

            <TabsContent value="phone" className="mt-4">
              <PhoneForm busy={busy} setBusy={setBusy} onDone={() => navigate({ to: "/dashboard" })} />
            </TabsContent>
          </Tabs>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          By continuing you accept the{" "}
          <Link to="/terms" className="underline hover:text-foreground">Terms</Link> and{" "}
          <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function EmailForm({
  mode,
  busy,
  setBusy,
  onDone,
}: {
  mode: "in" | "up";
  busy: boolean;
  setBusy: (b: boolean) => void;
  onDone: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ep = emailSchema.safeParse(email);
    const pp = passwordSchema.safeParse(password);
    if (!ep.success) return toast.error(ep.error.issues[0].message);
    if (!pp.success) return toast.error(pp.error.issues[0].message);

    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: ep.data, password: pp.data });
        if (error) throw error;
        toast.success("Signed in");
      } else {
        const { error } = await supabase.auth.signUp({
          email: ep.data,
          password: pp.data,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        toast.success("Account created. Check your inbox to confirm.");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.gov.in"
          autoComplete="email"
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {mode === "in" ? "Sign in" : "Create account"}
      </Button>
    </form>
  );
}

function PhoneForm({
  busy,
  setBusy,
  onDone,
}: {
  busy: boolean;
  setBusy: (b: boolean) => void;
  onDone: () => void;
}) {
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);

  const sendOtp = async () => {
    const p = phoneSchema.safeParse(phone);
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: p.data });
      if (error) throw error;
      setSent(true);
      toast.success("OTP sent");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP";
      toast.error(
        msg.toLowerCase().includes("sms")
          ? "SMS provider not configured yet. Add one in Cloud → Auth settings."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{4,8}$/.test(otp)) return toast.error("Enter the numeric OTP");
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
      if (error) throw error;
      toast.success("Signed in");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md border border-[color:var(--risk-heat)]/40 bg-[color:var(--risk-heat)]/10 p-2 text-[11px] text-[color:var(--risk-heat)]">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          Phone OTP requires an SMS provider (MSG91 / Gupshup / Twilio) configured under Cloud → Auth settings. Until then this
          form will fail with a provider error.
        </span>
      </div>
      <div>
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91XXXXXXXXXX"
          autoComplete="tel"
        />
      </div>
      {!sent ? (
        <Button type="button" className="w-full" onClick={sendOtp} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send OTP
        </Button>
      ) : (
        <>
          <div>
            <Label htmlFor="otp">OTP</Label>
            <Input
              id="otp"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="6-digit code"
              maxLength={8}
            />
          </div>
          <Button type="button" className="w-full" onClick={verifyOtp} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify OTP
          </Button>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Change number
          </button>
        </>
      )}
    </div>
  );
}
