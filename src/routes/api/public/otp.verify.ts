import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";
import { z } from "zod";

const bodySchema = z.object({
  phone: z.string().trim().regex(/^\+[1-9]\d{9,14}$/, "Enter phone in E.164 format"),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

const MAX_ATTEMPTS = 5;

function hashCode(phone: string, code: string) {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHash("sha256").update(`${phone}:${code}:${pepper}`).digest("hex");
}

function syntheticEmail(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `phone-${digits}@sms.varuna.local`;
}

export const Route = createFileRoute("/api/public/otp/verify")({
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
        const { phone, code } = parsed;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: row, error: fetchErr } = await supabaseAdmin
          .from("phone_otps")
          .select("code_hash, expires_at, attempts")
          .eq("phone", phone)
          .maybeSingle();
        if (fetchErr || !row) {
          return new Response(JSON.stringify({ error: "No OTP requested for this number" }), { status: 400, headers: cors });
        }
        if (new Date(row.expires_at).getTime() < Date.now()) {
          await supabaseAdmin.from("phone_otps").delete().eq("phone", phone);
          return new Response(JSON.stringify({ error: "OTP expired. Request a new one." }), { status: 400, headers: cors });
        }
        if (row.attempts >= MAX_ATTEMPTS) {
          await supabaseAdmin.from("phone_otps").delete().eq("phone", phone);
          return new Response(JSON.stringify({ error: "Too many attempts. Request a new code." }), { status: 429, headers: cors });
        }

        const expected = Buffer.from(row.code_hash, "hex");
        const actual = Buffer.from(hashCode(phone, code), "hex");
        const match = expected.length === actual.length && timingSafeEqual(expected, actual);

        if (!match) {
          await supabaseAdmin
            .from("phone_otps")
            .update({ attempts: row.attempts + 1 })
            .eq("phone", phone);
          return new Response(
            JSON.stringify({ error: "Incorrect code", attemptsLeft: MAX_ATTEMPTS - row.attempts - 1 }),
            { status: 400, headers: cors },
          );
        }

        // Successful verification — find or create user, then mint a
        // one-time magiclink token hash that the client exchanges for a
        // Supabase session. No password is ever transmitted.
        const email = syntheticEmail(phone);

        // Find existing mapping first
        const { data: mapping } = await supabaseAdmin
          .from("phone_identities")
          .select("user_id")
          .eq("phone", phone)
          .maybeSingle();

        let userId = mapping?.user_id ?? null;

        if (!userId) {
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
            phone,
            phone_confirm: true,
            user_metadata: { phone, sign_in_method: "phone_otp" },
          });
          if (createErr || !created.user) {
            console.error("[otp.verify] createUser error:", createErr?.message);
            return new Response(JSON.stringify({ error: "Could not create account" }), { status: 500, headers: cors });
          }
          userId = created.user.id;
          const { error: mapErr } = await supabaseAdmin
            .from("phone_identities")
            .upsert({ phone, user_id: userId }, { onConflict: "phone" });
          if (mapErr) console.error("[otp.verify] mapping upsert error:", mapErr.message);
        }

        // Generate a magiclink token hash for this user. The client will
        // verify it via supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
        // to establish a session.
        const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
        if (linkErr || !linkData?.properties?.hashed_token) {
          console.error("[otp.verify] generateLink error:", linkErr?.message);
          return new Response(JSON.stringify({ error: "Could not issue session token" }), { status: 500, headers: cors });
        }

        // Invalidate the OTP row so the same code cannot be reused
        await supabaseAdmin.from("phone_otps").delete().eq("phone", phone);

        return new Response(
          JSON.stringify({ ok: true, token_hash: linkData.properties.hashed_token }),
          { headers: cors },
        );
      },
    },
  },
});
