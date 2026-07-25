"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Purpose = "corpus" | "comparison";

export function DocumentUpload() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<Purpose>("corpus");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a PDF, DOCX, or TXT file.");
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("purpose", purpose);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body,
      });

      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        code?: string;
      };

      if (!res.ok) {
        setError(json.message ?? "Upload failed. Please try again.");
        return;
      }

      setFile(null);
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="document-file">Document</Label>
        <Input
          id="document-file"
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-purpose">Purpose</Label>
        <select
          id="document-purpose"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value as Purpose)}
        >
          <option value="corpus">Corpus (RAG chat)</option>
          <option value="comparison">Comparison</option>
        </select>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={loading || !file}>
        <Upload />
        {loading ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
