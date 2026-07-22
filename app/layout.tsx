import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clarion",
  description: "AI document chat and comparison — portfolio demo project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
