import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SnapLabs Global - Premium Construction Tech",
  description: "Luxury SaaS solutions for modern construction management. LedgerSnap and JobSite Snap - reimagining how construction teams work.",
  keywords: ["construction management", "receipt management", "jobsite management", "SaaS", "construction tech"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}
