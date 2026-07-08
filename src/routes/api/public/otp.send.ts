import { createFileRoute } from "@tanstack/react-router";
import { createHash, randomInt } from "crypto";
import { z } from "zod";

const bodySchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{9,14}$/, "Enter phone in E.164 format (e.g. +919876543210)"),
});

const OTP_TTL_SECONDS = 300; // 5 min
const RESEND_COOLDOWN_SECONDS = 30;

function hashCode(phone: string, code: string) {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${phone}:${code}:${pepper}`).digest("hex");
}

export const Route = createFileRoute("/api/public/otp/send")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
          },
        }),
      POST: async ({ request }) => {
        const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch (err) {
          const msg = err instanceof z.ZodError ? err.issues[0].message : "Invalid request";
          return new Response(JSON.stringify({ error: msg }), { status: 400, headers: cors });
        }
        const phone = parsed.phone;

        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
        const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
        if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM_NUMBER) {
          return new Response(JSON.stringify({ error: "SMS provider not configured" }), { status: 500, headers: cors });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Rate-limit resends
        const { data: existing } = await supabaseAdmin
          .from("phone_otps")
          .select("last_sent_at")
          .eq("phone", phone)
          .maybeSingle();
        if (existing?.last_sent_at) {
          const last = new Date(existing.last_sent_at).getTime();
          const secondsAgo = (Date.now() - last) / 1000;
          if (secondsAgo < RESEND_COOLDOWN_SECONDS) {
            return new Response(
              JSON.stringify({ error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsAgo)}s before resending` }),
              { status: 429, headers: cors },
            );
          }
        }

        const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
        const codeHash = hashCode(phone, code);
        const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

        const { error: upsertErr } = await supabaseAdmin
          .from("phone_otps")
          .upsert(
            { phone, code_hash: codeHash, expires_at: expiresAt, attempts: 0, last_sent_at: new Date().toISOString() },
            { onConflict: "phone" },
          );
        if (upsertErr) {
          return new Response(JSON.stringify({ error: "Could not queue OTP" }), { status: 500, headers: cors });
        }

        // Send via Twilio through Lovable gateway
        const gwRes = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: phone,
            From: TWILIO_FROM_NUMBER,
            Body: `VARUNA verification code: ${code}\nValid for 5 minutes. Do not share this code.`,
          }),
        });

        if (!gwRes.ok) {
          const text = await gwRes.text();
          console.error(`[otp.send] Twilio ${gwRes.status}: ${text}`);
          return new Response(
            JSON.stringify({ error: `SMS provider error [${gwRes.status}]` }),
            { status: 502, headers: cors },
          );
        }

        return new Response(JSON.stringify({ ok: true, expiresIn: OTP_TTL_SECONDS }), { headers: cors });
      },
    },
  },
});
