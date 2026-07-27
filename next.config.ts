import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Keep pdf-parse (and its pdfjs-dist tree) outside the serverless bundle.
  // pdfjs-dist touches browser globals like DOMMatrix at evaluate time; if
  // Next bundles it into the upload route chunk, every upload crashes —
  // even .txt — before parseDocument runs. Paired with the dynamic import
  // in lib/documents/parse.ts so the package loads only for real PDFs.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
