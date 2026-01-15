import { redirect } from "next/navigation";
import { getPersonalTenantOrThrow } from "@/lib/tenant_personal";
import { getSessionById, updateSessionMeta, mergeSessionResponses } from "@/lib/db/study_sessions";
import { SessionEditorForm, type SessionEditorDefaults } from "@/components/session-editor/SessionEditorForm";

function toDatetimeLocalValue(iso: string) {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
}

function fromDatetimeLocalValue(v: string) {
  if (!v || typeof v !== "string") return new Date().toISOString();
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function safeString(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v : "";
}

function normalizeGenre(raw: string) {
  const v = (raw || "").trim();
  return v ? v : "Unknown";
}

type StudyTrack = SessionEditorDefaults["track"];
type StudyMode = SessionEditorDefaults["mode"];
type SessionStatus = SessionEditorDefaults["status"];

function normalizeTrack(raw: unknown): StudyTrack {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "beginner" || v === "intermediate" || v === "advanced") return v as StudyTrack;
  return "beginner" as StudyTrack;
}

function normalizeMode(raw: unknown): StudyMode {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "guided") return "guided" as StudyMode;
  if (v === "free" || v === "freeform") return "free" as StudyMode;
  return "guided" as StudyMode;
}

function normalizeStatus(raw: unknown): SessionStatus {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (v === "complete") return "complete" as SessionStatus;
  return "draft" as SessionStatus;
}

async function saveSessionAction(args: { sessionId: string }, formData: FormData) {
  "use server";

  const tenant = await getPersonalTenantOrThrow();
  const sessionId = args.sessionId;

  const passage = safeString(formData.get("passage")).trim();
  const track = normalizeTrack(safeString(formData.get("track")));
  const mode = normalizeMode(safeString(formData.get("mode")));

  const genreSelected = normalizeGenre(safeString(formData.get("genre")).trim());
  const genreCustom = safeString(formData.get("genre_custom")).trim();
  const genreFinal = genreCustom ? normalizeGenre(genreCustom) : genreSelected;

  const status = normalizeStatus(safeString(formData.get("status")));

  const sessionDateLocal = safeString(formData.get("session_date")).trim();
  const sessionDateIso = fromDatetimeLocalValue(sessionDateLocal);

  await updateSessionMeta({
    workspaceId: tenant.id,
    sessionId,
    session_date: sessionDateIso,
    passage: passage ? passage : null,
    track,
    mode,
    genre: genreFinal,
    status,
  });

  const patch: Record<string, string> = {
    obs: safeString(formData.get("obs")).trim(),
    aud: safeString(formData.get("aud")).trim(),
    mean: safeString(formData.get("mean")).trim(),
    sim: safeString(formData.get("sim")).trim(),
    diff: safeString(formData.get("diff")).trim(),
    app: safeString(formData.get("app")).trim(),
    passageText: safeString(formData.get("passageText")).trim(),
    notes: safeString(formData.get("notes")).trim(),
    advStructure: safeString(formData.get("advStructure")).trim(),
    advThemes: safeString(formData.get("advThemes")).trim(),
    advCrossRefs: safeString(formData.get("advCrossRefs")).trim(),
    advWordStudy: safeString(formData.get("advWordStudy")).trim(),
    advCommentary: safeString(formData.get("advCommentary")).trim(),
  };

  await mergeSessionResponses({ workspaceId: tenant.id, sessionId, patch });

  if (status === "complete") {
    const token = Date.now().toString(10);
    redirect(`/sessions/${encodeURIComponent(sessionId)}/edit?saved=1&win=1&win_token=${encodeURIComponent(token)}`);
  }

  redirect(`/sessions/${encodeURIComponent(sessionId)}?saved=1`);
}

function pickFirstString(v: string | string[] | undefined): string | undefined {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function SessionEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionid: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await params;
  const sp = (await searchParams) ?? {};

  const saved = sp.saved === "1";
  const win = sp.win === "1";
  const winToken = pickFirstString(sp.win_token);

  const tenant = await getPersonalTenantOrThrow();
  const session = await getSessionById(tenant.id, p.sessionid);

  if (!session) {
    return <div>Session not found.</div>;
  }

  const r = (session.responses ?? {}) as Record<string, unknown>;

  const defaults: SessionEditorDefaults = {
    passage: session.passage ?? "",
    track: normalizeTrack(session.track),
    mode: normalizeMode(session.mode),
    genre: normalizeGenre(session.genre ?? "Unknown"),
    status: normalizeStatus(session.status),
    session_date: toDatetimeLocalValue(session.session_date),

    obs: String(r.obs ?? ""),
    aud: String(r.aud ?? ""),
    mean: String(r.mean ?? ""),
    sim: String(r.sim ?? ""),
    diff: String(r.diff ?? ""),
    app: String(r.app ?? ""),

    passageText: String(r.passageText ?? ""),
    notes: String(r.notes ?? ""),

    advStructure: String(r.advStructure ?? ""),
    advThemes: String(r.advThemes ?? ""),
    advCrossRefs: String(r.advCrossRefs ?? ""),
    advWordStudy: String(r.advWordStudy ?? ""),
    advCommentary: String(r.advCommentary ?? ""),
  };

  return (
    <SessionEditorForm
      tenantLabel="Personal"
      saved={saved}
      showWinMoment={win && defaults.status === "complete"}
      winMomentId={winToken ? `personal:${p.sessionid}:${winToken}` : `personal:${p.sessionid}`}
      backToViewerHref={`/sessions/${encodeURIComponent(p.sessionid)}`}
      backToStudyHref={`/studies`}
      defaults={defaults}
      action={saveSessionAction.bind(null, { sessionId: p.sessionid })}
    />
  );
}
