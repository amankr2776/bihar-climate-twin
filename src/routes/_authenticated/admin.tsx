import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, UserPlus, UserMinus, Sparkles, Activity, RefreshCw } from "lucide-react";
import {
  listUsersWithRoles,
  grantRole,
  revokeRole,
  getMyRoles,
  bootstrapFirstAdmin,
  listIngestAudit,
} from "@/lib/admin.functions";
import { PageHeader } from "@/components/varuna/HelpModal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Console · VARUNA" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminPage,
});

const ROLES = ["admin", "official", "citizen"] as const;
type Role = (typeof ROLES)[number];

function AdminPage() {
  const listFn = useServerFn(listUsersWithRoles);
  const myRolesFn = useServerFn(getMyRoles);
  const bootstrapFn = useServerFn(bootstrapFirstAdmin);
  const grantFn = useServerFn(grantRole);
  const revokeFn = useServerFn(revokeRole);
  const qc = useQueryClient();

  const myRoles = useQuery({ queryKey: ["myRoles"], queryFn: () => myRolesFn() });
  const isAdmin = (myRoles.data ?? []).includes("admin");

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn(),
    enabled: isAdmin,
  });

  // First-time bootstrap: requires a deployer-only setup secret.
  const bootstrap = useMutation({
    mutationFn: (setupSecret: string) => bootstrapFn({ data: { setupSecret } }),
    onSuccess: (r) => {
      if (r?.seeded) {
        toast.success("You are now the first admin");
        qc.invalidateQueries();
      } else {
        toast.info("Admin already exists — ask an admin to grant you the role");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Bootstrap failed"),
  });

  const grant = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => grantFn({ data: v }),
    onSuccess: () => {
      toast.success("Role granted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Grant failed"),
  });

  const revoke = useMutation({
    mutationFn: (v: { userId: string; role: Role }) => revokeFn({ data: v }),
    onSuccess: () => {
      toast.success("Role revoked");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Revoke failed"),
  });

  useEffect(() => {
    if (myRoles.isSuccess && !isAdmin) {
      // no-op; UI below handles it
    }
  }, [myRoles.isSuccess, isAdmin]);

  if (myRoles.isLoading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <PageHeader title="Admin Console" />
        <div className="mt-4 rounded-xl border border-border bg-panel p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-[color:var(--risk-heat)]" />
            <div className="flex-1">
              <h2 className="font-display text-lg font-semibold">Restricted area</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This console is for VARUNA administrators only. To claim the first-admin seat, enter the deployer
                setup secret (configured server-side as{" "}
                <code className="font-mono text-[11px]">ADMIN_BOOTSTRAP_SECRET</code>). If no secret is set, the
                initial admin must be seeded via SQL migration.
              </p>
              <BootstrapForm
                onSubmit={(secret) => bootstrap.mutate(secret)}
                pending={bootstrap.isPending}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 lg:p-6">
      <PageHeader
        title="Admin Console"
        subtitle="Manage user roles across the VARUNA platform"
        help={{
          title: "Admin Console",
          description:
            "Grant or revoke admin / official / citizen roles. Officials can view reports, admins can manage roles and dispatch alerts. The last admin cannot revoke their own admin role.",
        }}
      />

      {users.isLoading ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
        </div>
      ) : users.isError ? (
        <div className="mt-6 rounded-xl border border-[color:var(--risk-flood)]/40 bg-[color:var(--risk-flood)]/10 p-4 text-sm text-[color:var(--risk-flood)]">
          {users.error instanceof Error ? users.error.message : "Failed to load users"}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-panel">
          <table className="w-full text-[12px]">
            <thead className="border-b border-border">
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Confirmed</th>
                <th className="px-3 py-2">Last sign-in</th>
                <th className="px-3 py-2">Roles</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(users.data ?? []).map((u) => {
                const busy = grant.isPending || revoke.isPending;
                return (
                  <tr key={u.id} className="align-top">
                    <td className="px-3 py-2">
                      <div className="font-medium text-foreground">{u.email ?? u.phone ?? u.id}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{u.id}</div>
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {u.email_confirmed_at ? (
                        <span className="text-[color:var(--brand-cyan)]">Yes</span>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("en-IN") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 && <span className="text-[11px] text-muted-foreground">—</span>}
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className="rounded bg-[color:var(--risk-heat)]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[color:var(--risk-heat)]"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        {ROLES.map((r) => {
                          const has = u.roles.includes(r);
                          return (
                            <button
                              key={r}
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                has
                                  ? revoke.mutate({ userId: u.id, role: r })
                                  : grant.mutate({ userId: u.id, role: r })
                              }
                              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase transition-colors ${
                                has
                                  ? "border-[color:var(--risk-flood)]/60 text-[color:var(--risk-flood)] hover:bg-[color:var(--risk-flood)]/10"
                                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                              } disabled:opacity-50`}
                            >
                              {has ? <UserMinus className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                              {r}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <IngestObservability />
    </div>
  );
}

function IngestObservability() {
  const listFn = useServerFn(listIngestAudit);
  const audit = useQuery({
    queryKey: ["ingest-audit"],
    queryFn: () => listFn(),
    refetchInterval: 60_000,
  });

  const rows = audit.data ?? [];
  const bySource = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = bySource.get(r.source) ?? [];
    list.push(r);
    bySource.set(r.source, list);
  }
  const summary = Array.from(bySource.entries()).map(([source, list]) => {
    const latest = list[0];
    const okCount = list.filter((r) => r.status === "ok").length;
    return { source, latest, total: list.length, okCount };
  });

  return (
    <div className="mt-6 rounded-xl border border-border bg-panel">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-[color:var(--brand-cyan)]" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest">Ingest observability</h2>
        </div>
        <button
          type="button"
          onClick={() => audit.refetch()}
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:bg-accent"
        >
          <RefreshCw className={`h-3 w-3 ${audit.isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {audit.isLoading ? (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading ingest audit…
        </div>
      ) : audit.isError ? (
        <div className="p-4 text-sm text-[color:var(--risk-flood)]">
          {audit.error instanceof Error ? audit.error.message : "Failed to load ingest audit"}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">No ingest runs recorded yet.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 border-b border-border/60 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {summary.map(({ source, latest, total, okCount }) => {
              const ok = latest.status === "ok";
              const rel = timeAgo(latest.finished_at);
              return (
                <div key={source} className="rounded border border-border bg-background/40 p-2">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{source}</div>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                        ok
                          ? "bg-[color:var(--brand-cyan)]/15 text-[color:var(--brand-cyan)]"
                          : "bg-[color:var(--risk-flood)]/15 text-[color:var(--risk-flood)]"
                      }`}
                    >
                      {latest.status}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-semibold text-foreground">Last run · {rel}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {latest.rows_upserted}/{latest.rows_received} rows · {okCount}/{total} ok in last {total} runs
                  </div>
                </div>
              );
            })}
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 bg-panel">
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="px-3 py-2">Finished</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Rows</th>
                  <th className="px-3 py-2">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.slice(0, 40).map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                      {new Date(r.finished_at).toLocaleString("en-IN")}
                    </td>
                    <td className="px-3 py-2 font-mono">{r.source}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                          r.status === "ok"
                            ? "bg-[color:var(--brand-cyan)]/15 text-[color:var(--brand-cyan)]"
                            : "bg-[color:var(--risk-flood)]/15 text-[color:var(--risk-flood)]"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.rows_upserted}/{r.rows_received}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function BootstrapForm({
  onSubmit,
  pending,
}: {
  onSubmit: (secret: string) => void;
  pending: boolean;
}) {
  const [secret, setSecret] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (secret.trim().length > 0) onSubmit(secret.trim());
      }}
      className="mt-4 flex flex-col gap-2 sm:flex-row"
    >
      <input
        type="password"
        autoComplete="off"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="Deployer setup secret"
        className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[color:var(--brand-cyan)]"
      />
      <Button type="submit" disabled={pending || secret.trim().length === 0} className="gap-2">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Claim first-admin seat
      </Button>
    </form>
  );
}
