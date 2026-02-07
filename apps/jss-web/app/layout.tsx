import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobsiteSnap - Never Lose a Job Photo",
  description: "Job site photo management for contractors. Capture, organize, find—in seconds. Every photo belongs to a job.",
  keywords: ["job site photos", "construction photos", "contractor app", "job documentation"],
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  themeColor: "#FF7A00",  // 活力橙 (Vibrant Orange) for JobSite Snap
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF7A00" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                    .then((reg) => console.log('[JSS] SW registered:', reg.scope))
                    .catch((err) => console.error('[JSS] SW registration failed:', err));
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
