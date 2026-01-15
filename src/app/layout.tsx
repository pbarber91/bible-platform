// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Bible Tools Platform",
  description: "Biblical studies tools + courses for churches.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* NETBibleTagger (turns scripture refs into NET hover popups) */}
        <Script
          src="https://labs.bible.org/api/NETBibleTagger/v2/netbibletagger.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
