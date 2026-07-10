import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{9,14}$/, "Enter phone in E.164 format (e.g. +919876543210)"),
});

export const Route = createFileRoute("/api/public/sms/test")({
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

        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
        const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
        if (!LOVABLE_API_KEY || !TWILIO_API_KEY || !TWILIO_FROM_NUMBER) {
          return new Response(JSON.stringify({ error: "SMS provider not configured" }), { status: 500, headers: cors });
        }

        const gwRes = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TWILIO_API_KEY,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: parsed.phone,
            From: TWILIO_FROM_NUMBER,
            Body: `VARUNA alert channel test — SMS delivery is live. You will receive critical/high climate risk alerts at this number.`,
          }),
        });

        if (!gwRes.ok) {
          const text = await gwRes.text();
          console.error(`[sms.test] Twilio ${gwRes.status}: ${text}`);
          return new Response(
            JSON.stringify({ error: `SMS provider error [${gwRes.status}]: ${text.slice(0, 200)}` }),
            { status: 502, headers: cors },
          );
        }

        const body = await gwRes.json().catch(() => ({}));
        return new Response(JSON.stringify({ ok: true, sid: body.sid ?? null }), { headers: cors });
      },
    },
  },
});
