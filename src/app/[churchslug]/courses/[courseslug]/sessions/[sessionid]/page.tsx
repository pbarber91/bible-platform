import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getTenantBySlugOrThrow } from "@/lib/tenant";
import { getCourseBySlug } from "@/lib/db/courses";
import { getCourseSession } from "@/lib/db/courses";
import {
  getSessionProgress,
  setSessionCompleted,
  touchSessionProgress,
} from "@/lib/db/progress";

type Block =
  | { type: "video"; title?: string; url?: string | null }
  | { type: "markdown"; data: string }
  | { type: "callout"; variant?: string; title?: string; body?: string }
  | { type: string; [k: string]: any };

async function completeAction(
  args: {
    workspaceId: string;
    courseId: string;
    sessionId: string;
    churchslug: string;
    courseslug: string;
  },
  formData: FormData
) {
  "use server";
  const completed = String(formData.get("completed") ?? "") === "1";
  await setSessionCompleted({
    workspaceId: args.workspaceId,
    courseId: args.courseId,
    sessionId: args.sessionId,
    completed,
  });
  redirect(`/${args.churchslug}/courses/${args.courseslug}/sessions/${args.sessionId}`);
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ churchslug: string; courseslug: string; sessionid: string }>;
}) {
  const p = await params;

  const tenant = await getTenantBySlugOrThrow(p.churchslug);
  const course = await getCourseBySlug(tenant.id, p.courseslug);

  if (!course) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        Course not found.
      </div>
    );
  }

  const session = await getCourseSession(tenant.id, p.sessionid);
  if (!session) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        Session not found.
      </div>
    );
  }

  const user = await getUser();

  // Touch progress only if logged in (and RLS will ensure they must be enrolled)
  if (user) {
    try {
      await touchSessionProgress({
        workspaceId: tenant.id,
        courseId: course.id,
        sessionId: session.id,
      });
    } catch {
      // Ignore if not enrolled yet (or RLS blocks) — session gating should prevent this anyway.
    }
  }

  const progress = user ? await getSessionProgress(session.id) : null;
  const isCompleted = Boolean(progress?.completed_at);

  const content = (session.content ?? {}) as any;
  const blocks: Block[] = Array.isArray(content.blocks) ? content.blocks : [];

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500">Session</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{session.title}</h1>
            {session.summary ? <p className="mt-3 text-slate-600">{session.summary}</p> : null}
          </div>

          {user ? (
            <form
              action={completeAction.bind(null, {
                workspaceId: tenant.id,
                courseId: course.id,
                sessionId: session.id,
                churchslug: p.churchslug,
                courseslug: p.courseslug,
              })}
            >
              <input type="hidden" name="completed" value={isCompleted ? "0" : "1"} />
              <button
                type="submit"
                className={
                  isCompleted
                    ? "rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
                    : "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                }
              >
                {isCompleted ? "Completed ✓" : "Mark complete"}
              </button>
            </form>
          ) : null}
        </div>

        {user && progress?.last_viewed_at ? (
          <div className="mt-4 text-xs text-slate-500">
            Last viewed: {new Date(progress.last_viewed_at).toLocaleString()}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4">
        {blocks.map((b, idx) => {
          if (b.type === "video") {
            return (
              <div key={idx} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="text-sm font-semibold">{b.title ?? "Video"}</div>
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                  Video placeholder (URL not set yet).
                </div>
              </div>
            );
          }

          if (b.type === "markdown") {
            return (
              <div key={idx} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <pre className="whitespace-pre-wrap text-sm text-slate-800">{b.data}</pre>
              </div>
            );
          }

          if (b.type === "callout") {
            return (
              <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-semibold">{b.title ?? "Note"}</div>
                {b.body ? <div className="mt-2 text-sm text-slate-700">{b.body}</div> : null}
              </div>
            );
          }

          return (
            <div key={idx} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <div className="text-sm font-semibold">Unsupported block: {b.type}</div>
              <pre className="mt-3 overflow-auto text-xs text-slate-600">
                {JSON.stringify(b, null, 2)}
              </pre>
            </div>
          );
        })}
      </section>
    </div>
  );
}
