import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpendSpark AI Expense Tracker",
  description: "A playful AI-powered personal expense tracker built with Next.js, Supabase, OpenAI, Tailwind CSS, and Recharts."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
