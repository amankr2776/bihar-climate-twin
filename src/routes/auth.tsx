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
import { lovable } from "@/integrations/lovable/index";

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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Public header */}
      <header className="flex items-center justify-between border-b border-border bg-panel/40 px-6 py-4 backdrop-blur lg:px-12">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] font-display text-lg font-black text-background">
            V
          </div>
          <div className="font-display text-xl font-bold tracking-tight bg-gradient-to-r from-[color:var(--brand-magenta)] to-[color:var(--brand-cyan)] bg-clip-text text-transparent">
            VARUNA
          </div>
        </Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
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
              <GoogleButton busy={busy} setBusy={setBusy} />
              <div className="my-4 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                <span>or continue with email</span>
                <div className="h-px flex-1 bg-border" />
              </div>
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
          Admin sign-in for restricted operational tools. Public dashboards do not require authentication.
        </p>
      </div>

      <footer className="border-t border-border bg-panel/40 px-6 py-4 text-center text-[11px] text-muted-foreground lg:px-12">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-3">
          <span><span className="text-foreground">VARUNA</span> · Decision-support digital twin — not an official warning authority.</span>
          <a href="https://www.imdpune.gov.in/" target="_blank" rel="noreferrer" className="hover:text-foreground">IMD</a>
          <a href="https://www.mosdac.gov.in/" target="_blank" rel="noreferrer" className="hover:text-foreground">MOSDAC</a>
          <a href="https://bhuvan.nrsc.gov.in/" target="_blank" rel="noreferrer" className="hover:text-foreground">Bhuvan</a>
        </div>
      </footer>
    </div>
  );
}

function GoogleButton({ busy, setBusy }: { busy: boolean; setBusy: (b: boolean) => void }) {
  const onClick = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/dashboard",
      });
      if (result.error) throw result.error;
      // If redirected, browser will navigate away; otherwise session is set.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  };
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick} disabled={busy}>
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.31 0-6.01-2.74-6.01-6.11S8.69 5.98 12 5.98c1.88 0 3.14.8 3.86 1.49l2.63-2.53C16.9 3.4 14.66 2.4 12 2.4 6.94 2.4 2.85 6.5 2.85 12s4.09 9.6 9.15 9.6c5.28 0 8.78-3.72 8.78-8.95 0-.6-.06-1.06-.15-1.55H12z"/>
        </svg>
      )}
      Continue with Google
    </Button>
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

  const normalizePhone = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, "");
    if (raw.startsWith("+")) return `+${digits}`;
    if (digits.length === 10) return `+91${digits}`;
    return `+${digits}`;
  };

  const sendOtp = async () => {
    const p = phoneSchema.safeParse(normalizePhone(phone));
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    try {
      const res = await fetch("/api/public/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p.data }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to send OTP");
      setPhone(p.data);
      setSent(true);
      toast.success("OTP sent — check your SMS");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) return toast.error("Enter the 6-digit OTP");
    setBusy(true);
    try {
      const res = await fetch("/api/public/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "OTP verification failed");
      const { error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password });
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
      <div className="flex items-start gap-2 rounded-md border border-[color:var(--brand-cyan)]/40 bg-[color:var(--brand-cyan)]/10 p-2 text-[11px] text-[color:var(--brand-cyan)]">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        <span>We&rsquo;ll SMS a 6-digit code to your phone. Standard carrier rates may apply.</span>
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
          disabled={sent}
        />
      </div>
      {!sent ? (
        <Button type="button" className="w-full" onClick={sendOtp} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Send OTP
        </Button>
      ) : (
        <>
          <div>
            <Label htmlFor="otp">6-digit OTP</Label>
            <Input
              id="otp"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              maxLength={6}
              autoFocus
            />
          </div>
          <Button type="button" className="w-full" onClick={verifyOtp} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Verify & sign in
          </Button>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <button type="button" onClick={() => { setSent(false); setOtp(""); }} className="hover:text-foreground">
              Change number
            </button>
            <button type="button" onClick={sendOtp} disabled={busy} className="hover:text-foreground disabled:opacity-50">
              Resend OTP
            </button>
          </div>
        </>
      )}
    </div>
  );
}
