import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AppRole = z.enum(["admin", "official", "citizen"]);

async function assertCallerIsAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw new Error("role check failed: " + error.message);
  if (!data) throw new Error("forbidden");
}

/** Lists all users with their roles. Admin only. */
export const listUsersWithRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCallerIsAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: usersData, error: usersErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (usersErr) throw new Error(usersErr.message);
    const { data: roles, error: rolesErr } = await supabaseAdmin.from("user_roles").select("user_id, role");
    if (rolesErr) throw new Error(rolesErr.message);
    const roleMap = new Map<string, string[]>();
    for (const r of roles ?? []) {
      const list = roleMap.get(r.user_id) ?? [];
      list.push(r.role);
      roleMap.set(r.user_id, list);
    }
    return usersData.users.map((u) => ({
      id: u.id,
      email: u.email ?? null,
      phone: u.phone ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      roles: roleMap.get(u.id) ?? [],
    }));
  });

/** Grant a role to a user. Admin only. */
export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ userId: z.string().uuid(), role: AppRole }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Revoke a role from a user. Admin only. Cannot revoke your own last admin role. */
export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ userId: z.string().uuid(), role: AppRole }).parse(raw))
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && data.role === "admin") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { count } = await supabaseAdmin
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) throw new Error("Cannot revoke the last admin role");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Return current user's roles. Any signed-in user may call. */
export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.role as string);
  });

/**
 * Seed self as first admin. Requires a pre-shared deployer secret
 * (ADMIN_BOOTSTRAP_SECRET) known only to the operator, to prevent any
 * self-registered user from racing to claim the admin seat.
 *
 * If the secret env var is not set, bootstrap is disabled entirely —
 * the initial admin must be seeded out-of-band via SQL migration.
 */
export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => z.object({ setupSecret: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }) => {
    const expected = process.env.ADMIN_BOOTSTRAP_SECRET;
    if (!expected || expected.length < 8) {
      throw new Error(
        "First-admin bootstrap is disabled. Seed the initial admin via SQL migration.",
      );
    }
    // Timing-safe-ish compare via hashed digests of equal length.
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const a = createHash("sha256").update(data.setupSecret, "utf8").digest();
    const b = createHash("sha256").update(expected, "utf8").digest();
    if (!timingSafeEqual(a, b)) {
      throw new Error("Invalid setup secret");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0) return { seeded: false };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    return { seeded: true };
  });
