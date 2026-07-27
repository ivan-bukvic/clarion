/**
 * Authenticated HTTP upload against a running `next start` server.
 * Uses service-role magiclink → verifyOtp to obtain a session, then
 * posts .txt and .pdf to /api/documents/upload.
 *
 * Run (with server up on PORT, default 3010):
 *   npx tsx --env-file=.env.local scripts/verify-upload-http.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.UPLOAD_TEST_BASE_URL ?? "http://localhost:3010";

function buildMinimalPdf(text: string): Buffer {
  const stream = `BT /F1 12 Tf 72 720 Td (${text.replace(/[()\\]/g, "\\$&")}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream, "utf-8")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf, "utf-8"));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf-8");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "utf-8");
}

function cookieHeaderFromSession(accessToken: string, refreshToken: string) {
  // @supabase/ssr cookie shape used by createServerClient — enough for getUser().
  const projectRef = new URL(
    process.env.NEXT_PUBLIC_SUPABASE_URL!
  ).hostname.split(".")[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const value = encodeURIComponent(
    JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    })
  );
  return `${storageKey}=${value}`;
}

async function upload(
  cookie: string,
  filename: string,
  buffer: Buffer,
  contentType: string
) {
  const form = new FormData();
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  form.append("file", new Blob([arrayBuffer], { type: contentType }), filename);
  form.append("purpose", "corpus");

  const res = await fetch(`${BASE}/api/documents/upload`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(
      `upload ${filename} failed: ${res.status} ${bodyText.slice(0, 500)}`
    );
  }
  if (/DOMMatrix/i.test(bodyText)) {
    throw new Error(`upload ${filename} returned DOMMatrix error: ${bodyText}`);
  }
  const json = JSON.parse(bodyText) as {
    document?: { id?: string };
    document_id?: string;
  };
  const documentId = json.document?.id ?? json.document_id;
  if (!documentId) {
    throw new Error(`upload ${filename}: missing document id in ${bodyText}`);
  }
  return documentId;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 5,
  });
  if (listError) throw listError;
  const email = listed.users[0]?.email;
  if (!email) throw new Error("No seeded auth user found");

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
  if (linkError) throw linkError;

  const tokenHash = linkData.properties.hashed_token;
  const { data: verified, error: verifyError } = await admin.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  });
  if (verifyError || !verified.session) {
    throw new Error(
      `verifyOtp failed: ${verifyError?.message ?? "no session"}`
    );
  }

  const cookie = cookieHeaderFromSession(
    verified.session.access_token,
    verified.session.refresh_token
  );

  const txtPath = join(process.cwd(), "demo-documents", "scope-of-work.txt");
  const txtId = await upload(
    cookie,
    "scope-of-work.txt",
    readFileSync(txtPath),
    "text/plain"
  );
  console.log("PASS: authenticated .txt upload", { document_id: txtId });

  const pdfId = await upload(
    cookie,
    "lazy-pdf-check.pdf",
    buildMinimalPdf("Clarion HTTP PDF upload check"),
    "application/pdf"
  );
  console.log("PASS: authenticated .pdf upload", { document_id: pdfId });
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
