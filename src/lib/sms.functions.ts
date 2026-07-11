import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Sends a Twilio alert-channel test SMS to the phone number provided by the
 * caller. Auth-gated (requires a signed-in Supabase session) and rate-limited
 * per user to prevent SMS-pumping / bill-bombing via a public endpoint.
 *
 * Best-effort in-memory rate limit (per-worker isolate): 3 sends per user
 * per 10 minutes. Sufficient to stop trivial abuse; real production traffic
 * would be gated by Twilio's SMS Pumping Protection + Geo Permissions.
 */

const bodySchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{9,14}$/, "Enter phone in E.164 format (e.g. +919876543210)"),
});

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;
const rateBuckets = new Map<string, number[]>();

function checkRate(userId: string): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const arr = (rateBuckets.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    const oldest = arr[0];
    return { ok: false, retryAfterSec: Math.ceil((WINDOW_MS - (now - oldest)) / 1000) };
  }
  arr.push(now);
  rateBuckets.set(userId, arr);
  return { ok: true };
}

export const sendTestSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => bodySchema.parse(input))
  .handler(async ({ data, context }) => {
    const gate = checkRate(context.userId);
    if (!gate.ok) {
      throw new Error(
        `Too many test messages — try again in ~${gate.retryAfterSec}s (limit ${MAX_PER_WINDOW} / ${WINDOW_MS / 60000}m).`,
      );
    }

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
    const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
    if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM_NUMBER) {
      throw new Error("SMS provider not configured");
    }

    const gwRes = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TWILIO_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: data.phone,
        From: TWILIO_FROM_NUMBER,
        Body: `VARUNA alert channel test — SMS delivery is live. You will receive critical/high climate risk alerts at this number.`,
      }),
    });

    if (!gwRes.ok) {
      const text = await gwRes.text();
      console.error(`[sms.test] Twilio ${gwRes.status}: ${text}`);
      throw new Error(`SMS provider error [${gwRes.status}]: ${text.slice(0, 200)}`);
    }

    const body = (await gwRes.json().catch(() => ({}))) as { sid?: string };
    return { ok: true as const, sid: body.sid ?? null };
  });
