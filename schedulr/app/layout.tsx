import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Schedulr — Smarter Booking for Everyone",
    template: "%s | Schedulr",
  },
  description:
    "The intelligent scheduling platform. AI-powered availability, built-in payments, waitlists, and beautiful booking pages. Better than Cal.com.",
  keywords: ["scheduling", "booking", "calendar", "meetings", "appointments"],
  openGraph: {
    title: "Schedulr — Smarter Booking for Everyone",
    description: "AI-powered scheduling with built-in payments, waitlists, and team features.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-slate-900">{children}</body>
    </html>
  );
}
