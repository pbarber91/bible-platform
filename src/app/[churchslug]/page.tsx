import { getTenantBySlugOrThrow } from "@/lib/tenant";

export default async function ChurchHomePage({
  params,
}: {
  params: Promise<{ churchslug: string }>;
}) {
  const p = await params;
  const tenant = await getTenantBySlugOrThrow(p.churchslug);

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="text-sm font-medium text-slate-500">Welcome</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{tenant.name}</h1>

        <p className="mt-3 max-w-2xl text-slate-600">
          This is your church portal. Courses and tools will live here under one cohesive ecosystem.
        </p>

        <div className="mt-6 flex gap-3">
          <a
            href={`/${p.churchslug}/courses`}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Browse Courses
          </a>
          <a
            href="/login"
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200"
          >
            Sign in
          </a>
        </div>
      </section>
    </div>
  );
}
