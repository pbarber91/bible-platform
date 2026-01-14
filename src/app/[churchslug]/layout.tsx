import { getUser } from "@/lib/auth";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function isWorkspaceAdmin(workspaceId: string, userId: string) {
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return false;
  const role = data?.role ?? null;
  return role === "admin" || role === "owner";
}

export default async function ChurchLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ churchslug: string }>;
}) {
  const p = await params;
  const churchslug = p.churchslug;

  const user = await getUser();
  const tenant = await getTenantBySlugOrThrow(churchslug);

  const adminOk =
    user?.id ? await isWorkspaceAdmin(tenant.id, user.id) : false;

  const base = `/${encodeURIComponent(churchslug)}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          {/* Brand */}
          <a href={base} className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-slate-900" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Bible Tools</div>
              <div className="text-xs text-slate-500">
                {tenant.name || "Church portal"}
              </div>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 text-sm sm:flex">
            <a
              className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
              href={base}
            >
              Home
            </a>
            <a
              className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
              href={`${base}/courses`}
            >
              Courses
            </a>
            <a
              className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
              href={`${base}/studies`}
            >
              Studies
            </a>

            {adminOk ? (
              <a
                className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
                href={`${base}/admin`}
              >
                Admin
              </a>
            ) : null}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Mobile menu (simple, no JS) */}
            <details className="relative sm:hidden">
              <summary className="list-none cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
                Menu
              </summary>
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                <a
                  className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  href={base}
                >
                  Home
                </a>
                <a
                  className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  href={`${base}/courses`}
                >
                  Courses
                </a>
                <a
                  className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  href={`${base}/studies`}
                >
                  Studies
                </a>
                {adminOk ? (
                  <a
                    className="block rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    href={`${base}/admin`}
                  >
                    Admin
                  </a>
                ) : null}

                <div className="my-2 border-t border-slate-100" />

                {user ? (
                  <a
                    className="block rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
                    href={`/logout?next=${encodeURIComponent(base)}`}
                  >
                    Sign out
                  </a>
                ) : (
                  <a
                    className="block rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
                    href={`/login?next=${encodeURIComponent(base)}`}
                  >
                    Sign in
                  </a>
                )}
              </div>
            </details>

            {/* Auth button (desktop + mobile) */}
            {user ? (
              <a
                className="hidden rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200 sm:inline-flex"
                href={`/logout?next=${encodeURIComponent(base)}`}
              >
                Sign out
              </a>
            ) : (
              <a
                className="hidden rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 sm:inline-flex"
                href={`/login?next=${encodeURIComponent(base)}`}
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
