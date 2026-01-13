import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobSite Snap - 掌控全局",
  description: "Construction project management dashboard with real-time insights. Control every project, optimize every cost.",
  keywords: ["construction management", "project dashboard", "cost optimization", "real-time analytics"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
