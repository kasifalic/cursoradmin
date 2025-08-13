import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "../components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Amagi Cursor Analytics | Vibe Coder Productivity Dashboard",
  description: "Comprehensive analytics dashboard for Cursor AI usage, productivity tracking, and license optimization at Amagi",
  keywords: ["cursor", "analytics", "productivity", "amagi", "ai", "development"],
  authors: [{ name: "Amagi Engineering Team" }],
  robots: {
    index: false, // Don't index this internal tool
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
