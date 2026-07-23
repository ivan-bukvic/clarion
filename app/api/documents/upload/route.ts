import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guard";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { parseDocument } from "@/lib/documents/parse";
import { chunkText } from "@/lib/documents/chunk";
import { chunkCreatedAtTimestamps } from "@/lib/documents/chunk-timestamps";
import { embed } from "@/lib/llm/embeddings";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

const purposeSchema = z.enum(["corpus", "comparison"]);

type AllowedType = {
  fileType: Database["public"]["Enums"]["document_file_type"];
  mimes: string[];
};

// Map avoids prototype-chain false positives from `in` on plain objects
// (e.g. "constructor" would pass `ext in ALLOWED_TYPES`).
const ALLOWED_TYPES = new Map<string, AllowedType>([
  ["pdf", { fileType: "pdf", mimes: ["application/pdf"] }],
  [
    "docx",
    {
      fileType: "docx",
      mimes: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/octet-stream",
      ],
    },
  ],
  ["txt", { fileType: "txt", mimes: ["text/plain", "application/octet-stream"] }],
]);

type ErrorCode = "UPLOAD_FAILED" | "PARSE_FAILED" | "EMBEDDING_FAILED";

function errorResponse(code: ErrorCode, message: string, status: number) {
  return NextResponse.json({ code, message }, { status });
}

function extensionOf(filename: string): string | null {
  const parts = filename.toLowerCase().split(".");
  if (parts.length < 2) return null;
  return parts.at(-1) ?? null;
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").trim() || filename;
}

export async function POST(request: Request) {
  const { unauthorized } = await requireSession();
  if (unauthorized) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { message: "Invalid multipart form data." },
      { status: 400 }
    );
  }

  const purposeResult = purposeSchema.safeParse(formData.get("purpose"));
  if (!purposeResult.success) {
    return NextResponse.json(
      { message: "purpose must be corpus or comparison." },
      { status: 400 }
    );
  }
  const purpose = purposeResult.data;

  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return NextResponse.json(
      { message: "A file is required." },
      { status: 400 }
    );
  }

  if (fileEntry.size <= 0 || fileEntry.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { message: "File must be between 1 byte and 15MB." },
      { status: 400 }
    );
  }

  const ext = extensionOf(fileEntry.name);
  if (!ext || !ALLOWED_TYPES.has(ext)) {
    return NextResponse.json(
      { message: "Only PDF, DOCX, and TXT files are allowed." },
      { status: 400 }
    );
  }

  const allowed = ALLOWED_TYPES.get(ext)!;
  const rawMime = fileEntry.type || "";
  const mime = rawMime.split(";")[0].trim().toLowerCase();
  // Extension already validated; accept empty MIME (some browsers omit it)
  // or a known MIME for that extension.
  if (mime && !allowed.mimes.includes(mime)) {
    return NextResponse.json(
      { message: "File type does not match a supported MIME type." },
      { status: 400 }
    );
  }

  const contentType = mime || allowed.mimes[0];

  const fileType = allowed.fileType;
  const sourceFile = fileEntry.name;
  const title = titleFromFilename(sourceFile);
  const documentId = crypto.randomUUID();
  // Path built only from server-generated values — never from the client
  // filename (SECURITY.md §4: upload is the most sensitive surface).
  const storagePath = `${purpose}/${documentId}.${ext}`;

  const supabase = createServiceRoleClient();
  const buffer = Buffer.from(await fileEntry.arrayBuffer());

  try {
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("UPLOAD_FAILED", uploadError);
      return errorResponse(
        "UPLOAD_FAILED",
        "Could not upload the file. Please try again.",
        500
      );
    }

    const { data: document, error: insertError } = await supabase
      .from("documents")
      .insert({
        id: documentId,
        title,
        source_file: sourceFile,
        file_type: fileType,
        purpose,
        storage_path: storagePath,
        status: "processing",
      })
      .select()
      .single();

    if (insertError || !document) {
      console.error("UPLOAD_FAILED", insertError);
      await supabase.storage.from("documents").remove([storagePath]);
      return errorResponse(
        "UPLOAD_FAILED",
        "Could not save the document record. Please try again.",
        500
      );
    }

    try {
      const parsed = await parseDocument(buffer, fileType);
      const chunks = chunkText(parsed);

      if (chunks.length === 0) {
        throw new Error("PARSE_FAILED: no chunks produced from document");
      }

      let embeddings: number[][];
      try {
        embeddings = await embed(
          chunks.map((c) => c.content),
          "document"
        );
      } catch (err) {
        console.error("EMBEDDING_FAILED", err);
        await supabase
          .from("documents")
          .update({ status: "failed" })
          .eq("id", documentId);
        return errorResponse(
          "EMBEDDING_FAILED",
          "Could not embed document chunks. Please try again.",
          500
        );
      }

      const createdAts = chunkCreatedAtTimestamps(chunks.length);
      const rows = chunks.map((chunk, i) => ({
        document_id: documentId,
        heading: chunk.heading,
        content: chunk.content,
        embedding: JSON.stringify(embeddings[i]) as unknown as string,
        created_at: createdAts[i],
      }));

      const { error: chunkError } = await supabase
        .from("document_chunks")
        .insert(rows);

      if (chunkError) {
        console.error("EMBEDDING_FAILED", chunkError);
        await supabase
          .from("documents")
          .update({ status: "failed" })
          .eq("id", documentId);
        return errorResponse(
          "EMBEDDING_FAILED",
          "Could not save document chunks. Please try again.",
          500
        );
      }

      try {
        const { data: readyDoc, error: readyError } = await supabase
          .from("documents")
          .update({ status: "ready" })
          .eq("id", documentId)
          .select()
          .single();

        if (readyError || !readyDoc) {
          throw readyError ?? new Error("ready update returned no row");
        }

        return NextResponse.json({ document: readyDoc });
      } catch (readyErr) {
        // Chunks are already saved — never leave status stuck on "processing".
        console.error("UPLOAD_FAILED", readyErr);
        try {
          await supabase
            .from("documents")
            .update({ status: "failed" })
            .eq("id", documentId);
        } catch (failErr) {
          // Known limitation (demo scope): if both the ready update and this
          // fallback fail in the same narrow window (same transient DB
          // outage), status stays "processing". Retry is intentionally not
          // added — residual risk accepted for portfolio demo duration.
          console.error(
            "Could not mark document failed after ready update error",
            failErr
          );
        }
        return errorResponse(
          "UPLOAD_FAILED",
          "Document was processed but status update failed.",
          500
        );
      }
    } catch (err) {
      // Only parse/chunk failures reach here — embedding errors return above.
      console.error("PARSE_FAILED", err);
      await supabase
        .from("documents")
        .update({ status: "failed" })
        .eq("id", documentId);

      return errorResponse(
        "PARSE_FAILED",
        "Could not parse the uploaded file. Please check the file and try again.",
        500
      );
    }
  } catch (err) {
    console.error("UPLOAD_FAILED", err);
    return errorResponse(
      "UPLOAD_FAILED",
      "Upload failed unexpectedly. Please try again.",
      500
    );
  }
}
