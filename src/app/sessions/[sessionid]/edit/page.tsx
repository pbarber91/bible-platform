// src/app/sessions/[sessionid]/edit/page.tsx
import { redirect } from "next/navigation";
import { getPersonalTenantOrThrow } from "@/lib/tenant_personal";
import {
  getSessionById,
  updateSessionMeta,
  mergeSessionResponses,
} from "@/lib/db/study_sessions";
import {
  SessionEditorForm,
  type SessionEditorDefaults,
} from "@/components/session-editor/SessionEditorForm";

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
  if (v === "beginner" || v === "intermediate" || v === "advanced")
    return v as StudyTrack;
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

const NIV_REQUIRED_CITATION =
  "The Holy Bible, New International Version® NIV® Copyright © 1973, 1978, 1984, 2011 by Biblica, Inc.® Used by Permission of Biblica, Inc.® All rights reserved worldwide. To learn more, visit http://biblica.com and http://facebook.com/Biblica.";

function envClean(v: string | undefined | null): string {
  return (v || "").trim();
}

function decodeHtmlEntities(s: string): string {
  if (!s) return "";
  return decodeBasicEntities(s);
}

function stripHtmlToText(html: string): string {
  let s = String(html || "");

  // Convert line-ish tags to newlines first
  s = s.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  s = s.replace(/<\s*hr\s*\/?\s*>/gi, "\n");
  s = s.replace(/<\s*\/\s*(p|div|section|h1|h2|h3|h4|h5|h6|li)\s*>/gi, "\n");
  s = s.replace(/<\s*(p|div|section|h1|h2|h3|h4|h5|h6|li)(\s+[^>]*)?>/gi, "");

  // Strip remaining tags
  s = s.replace(/<[^>]+>/g, "");

  // Decode entities
  s = decodeHtmlEntities(s);

  // Normalize whitespace
  s = s.replace(/\r\n/g, "\n");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

async function netFetchPlainTextAction(passage: string): Promise<string> {
  "use server";

  const clean = (passage || "").trim();
  if (!clean) return "";

  const base = envClean(process.env.API_BIBLE_BASE || "https://rest.api.bible").replace(
    /\/+$/,
    ""
  );
  const key = envClean(process.env.API_BIBLE_KEY);
  const bibleId = envClean(process.env.API_BIBLE_DEFAULT_BIBLE_ID);

  if (!key) throw new Error("API.Bible key not configured (API_BIBLE_KEY).");
  if (!bibleId)
    throw new Error("Default Bible ID not configured (API_BIBLE_DEFAULT_BIBLE_ID).");

  const url = `${base}/v1/bibles/${encodeURIComponent(
    bibleId
  )}/search?query=${encodeURIComponent(clean)}&offset=0`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "api-key": key,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`API.Bible error (${res.status})`);
  }

  const json = (await res.json()) as any;
  const passages = json?.data?.passages;
  const first = Array.isArray(passages) ? passages[0] : null;
  const contentHtml = typeof first?.content === "string" ? first.content : "";

  if (!contentHtml) return "";
  const text = stripHtmlToText(contentHtml);
  if (!text) return "";

  return `${text}\n\n—\n${NIV_REQUIRED_CITATION}`;
}

async function apiBibleSearchAction(queryRaw: string): Promise<{
  query: string;
  total: number;
  verses: Array<{ reference: string; text: string }>;
  citation: string;
}> {
  "use server";

  const query = (queryRaw || "").trim();
  if (!query) return { query: "", total: 0, verses: [], citation: NIV_REQUIRED_CITATION };

  const base = envClean(process.env.API_BIBLE_BASE || "https://rest.api.bible").replace(/\/+$/, "");
  const key = envClean(process.env.API_BIBLE_KEY);
  const bibleId = envClean(process.env.API_BIBLE_DEFAULT_BIBLE_ID);

  if (!key) throw new Error("API.Bible key not configured (API_BIBLE_KEY).");
  if (!bibleId)
    throw new Error("Default Bible ID not configured (API_BIBLE_DEFAULT_BIBLE_ID).");

  const url = `${base}/v1/bibles/${encodeURIComponent(bibleId)}/search?query=${encodeURIComponent(
    query
  )}&offset=0&limit=10`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "api-key": key,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`API.Bible error (${res.status})`);
  }

  const json = (await res.json()) as any;
  const rawVerses = Array.isArray(json?.data?.verses) ? json.data.verses : [];
  const verses = rawVerses
    .map((v: any) => ({
      reference: String(v?.reference ?? v?.id ?? "").trim(),
      text: stripHtmlToText(String(v?.text ?? "")).trim(),
    }))
    .filter((v: any) => v.reference || v.text);

  const totalRaw = Number(json?.data?.total);
  const total = Number.isFinite(totalRaw) ? totalRaw : verses.length;

  return { query, total, verses, citation: NIV_REQUIRED_CITATION };
}

function decodeBasicEntities(s: string): string {
  return (
    s
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => {
        const code = Number(n);
        return Number.isFinite(code) ? String.fromCharCode(code) : _;
      })
  );
}

async function netFetchNotesAction(passage: string): Promise<string> {
  "use server";

  const clean = (passage || "").trim();
  if (!clean) return "";

  const url = `https://labs.bible.org/api/?passage=${encodeURIComponent(
    clean
  )}&type=text&formatting=full`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`NET Labs error (${res.status})`);
  }

  const xml = await res.text();

  // Extract <note> blocks; fallback if none.
  const noteBlocks = Array.from(xml.matchAll(/<note[^>]*>([\s\S]*?)<\/note>/gi)).map((m) =>
    stripHtmlToText(m[1] || "")
  );

  if (!noteBlocks.length) return "No NET note blocks were returned for this passage.";

  return noteBlocks.filter(Boolean).join("\n\n—\n\n");
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
    redirect(
      `/sessions/${encodeURIComponent(sessionId)}/edit?saved=1&win=1&win_token=${encodeURIComponent(
        token
      )}`
    );
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
      winMomentId={
        winToken ? `personal:${p.sessionid}:${winToken}` : `personal:${p.sessionid}`
      }
      backToViewerHref={`/sessions/${encodeURIComponent(p.sessionid)}`}
      backToStudyHref={`/studies`}
      defaults={defaults}
      action={saveSessionAction.bind(null, { sessionId: p.sessionid })}
      netFetchPlainTextAction={netFetchPlainTextAction}
      netFetchNotesAction={netFetchNotesAction}
      apiBibleSearchAction={apiBibleSearchAction}
    />
  );
}
