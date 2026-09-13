import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReachInbox Scheduler",
  description: "Schedule and track cold email sends",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen">{children}</body>
    </html>
  );
}
