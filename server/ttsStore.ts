import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { supabase } from "./supabase.js";

// TTS cache object store. Cloudflare R2 when R2_* env vars are set; otherwise
// the legacy Supabase `vocabulary-audio` bucket so local dev works unchanged.

const SUPABASE_BUCKET = "vocabulary-audio";

let r2Client: S3Client | null | undefined;

// Built on first use, after dotenv.config() has run in server/index.ts.
function getR2(): S3Client | null {
  if (r2Client !== undefined) return r2Client;
  const accountId = process.env.R2_ACCOUNT_ID;
  const endpoint =
    process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "");
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  r2Client =
    endpoint && accessKeyId && secretAccessKey
      ? new S3Client({ region: "auto", endpoint, credentials: { accessKeyId, secretAccessKey } })
      : null;
  return r2Client;
}

const r2Bucket = () => process.env.R2_BUCKET_NAME || "rongwaps-audio";

/** Cached object bytes, or null on a miss or any read error. */
export async function getTtsObject(key: string): Promise<Buffer | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<null>((resolve) => {
    timer = setTimeout(() => { controller.abort(); resolve(null); }, 5000);
  });
  const read = (async () => {
    const r2 = getR2();
    if (r2) {
      const res = await r2.send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }), { abortSignal: controller.signal });
      if ((res.ContentLength ?? 0) > 4 * 1024 * 1024) return null;
      const bytes = await res.Body?.transformToByteArray();
      return bytes?.length ? Buffer.from(bytes) : null;
    }
    const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).download(key, {}, { signal: controller.signal });
    if (error || !data?.size || data.size > 4 * 1024 * 1024) return null;
    return Buffer.from(await data.arrayBuffer());
  })();
  try {
    return await Promise.race([read, deadline]);
  } catch {
    return null; // Missing, invalid or unavailable storage must not block synthesis.
  } finally {
    clearTimeout(timer!);
  }
}

/** Best-effort cache write; never throws. */
export async function putTtsObject(key: string, body: Buffer): Promise<void> {
  try {
    const r2 = getR2();
    if (r2) {
      await r2.send(
        new PutObjectCommand({ Bucket: r2Bucket(), Key: key, Body: body, ContentType: "audio/mpeg" }),
        { abortSignal: AbortSignal.timeout(5000) },
      );
      return;
    }
    // Plain insert (no upsert): the anon UPDATE policy was removed in
    // 20260816_security_hardening.sql, so upsert would 403.
    await supabase.storage.from(SUPABASE_BUCKET).upload(key, body, { contentType: "audio/mpeg" });
  } catch (err: unknown) {
    console.warn("TTS cache upload failed:", err);
  }
}
