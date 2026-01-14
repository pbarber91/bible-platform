import { redirect } from "next/navigation";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { requireWorkspaceAdmin } from "@/lib/admin";
import { decideAccessRequest, listWorkspaceAccessRequests } from "@/lib/db/admin_requests";

async function decideAction(args: { requestId: string; decision: "approved" | "denied"; nextUrl: string }) {
  "use server";
  await decideAccessRequest(args.requestId, args.decision);
  redirect(args.nextUrl);
}

function Tile({
  title,
  desc,
  href,
  badge,
}: {
  title: string;
  desc: string;
  href: string;
  badge?: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:bg-slate-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {badge ? (
          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-2 text-sm text-slate-600">{desc}</div>
      <div className="mt-3 text-xs font-semibold text-slate-500 group-hover:text-slate-700">
        Open →
      </div>
    </a>
  );
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ churchslug: string }>;
}) {
  const p = await params;

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  await requireWorkspaceAdmin(tenant.id);

  const nextUrl = `/${p.churchslug}/admin`;
  const requests = await listWorkspaceAccessRequests(tenant.id);

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-xs text-slate-500">Admin</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{tenant.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage your church portal: courses, sessions, and access requests.
        </p>
      </section>

      {/* HUB TILES */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Tile
          title="Access requests"
          desc="Approve or deny admin access requests for this church."
          href={`/${p.churchslug}/admin`}
          badge={pending.length ? `${pending.length} pending` : undefined}
        />
        <Tile
          title="Courses"
          desc="Create/edit courses and manage sessions."
          href={`/${p.churchslug}/admin/courses`}
        />
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <div className="flex items-start justify-between gap-3">
            <div className="font-semibold text-slate-900">Members</div>
            <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
              coming soon
            </span>
          </div>
          <div className="mt-2">
            Role management (participant / leader / instructor / admin).
          </div>
        </div>
      </section>

      {/* REQUESTS LIST (stays right here) */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold">Pending requests ({pending.length})</div>
          <a
            href={`/${p.churchslug}/admin/courses`}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
          >
            Go to courses →
          </a>
        </div>

        {pending.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            No pending requests.
          </div>
        ) : (
          <div className="grid gap-3">
            {pending.map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Requested: {r.requested_role}</div>
                    <div className="mt-1 text-xs text-slate-500">User: {r.user_id}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Submitted: {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <form
                      action={decideAction.bind(null, {
                        requestId: r.id,
                        decision: "approved",
                        nextUrl,
                      })}
                    >
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        Approve
                      </button>
                    </form>

                    <form
                      action={decideAction.bind(null, {
                        requestId: r.id,
                        decision: "denied",
                        nextUrl,
                      })}
                    >
                      <button
                        type="submit"
                        className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                      >
                        Deny
                      </button>
                    </form>
                  </div>
                </div>

                {r.message ? (
                  <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                    {r.message}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HISTORY */}
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 text-sm font-semibold">History ({decided.length})</div>

        {decided.length === 0 ? (
          <div className="text-sm text-slate-600">No decisions yet.</div>
        ) : (
          <div className="grid gap-2">
            {decided.slice(0, 25).map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold">
                    {r.status === "approved" ? "✅ Approved" : "❌ Denied"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {r.decided_at ? new Date(r.decided_at).toLocaleString() : ""}
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-500">User: {r.user_id}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
