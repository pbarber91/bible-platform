import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function sendMagicLink(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "/mcc").trim();

  if (!email) {
    redirect("/login?error=missing_email");
  }

  // Safety: only allow internal redirects
  const safeNext = next.startsWith("/") ? next : "/mcc";

  const h = await headers();
  const origin = h.get("origin") ?? "http://localhost:3000";

  const sb = await createSupabaseServerClient();

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/login?sent=1&email=${encodeURIComponent(email)}`);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; email?: string; error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const sent = sp.sent === "1";
  const email = sp.email ?? "";
  const error = sp.error ?? "";
  const next = sp.next ?? "/mcc";

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-600">
          We’ll email you a magic link to sign in.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error === "missing_email" ? "Please enter an email address." : error}
          </div>
        ) : null}

        {sent ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            Magic link sent{email ? <> to <span className="font-semibold">{email}</span></> : null}. Check your inbox.
          </div>
        ) : null}

        <form action={sendMagicLink} className="mt-6 grid gap-3">
          <input type="hidden" name="next" value={next} />
          <label className="grid gap-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@church.org"
              defaultValue={email}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </label>

          <button
            type="submit"
            className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Send magic link
          </button>

          <a
            href={next}
            className="mt-1 rounded-xl bg-slate-100 px-4 py-2 text-center text-sm font-semibold text-slate-800 hover:bg-slate-200"
          >
            Back
          </a>
        </form>
      </div>
    </div>
  );
}
