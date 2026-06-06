import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Impact Dashboard",
  description: "Theory of Change reporting for the Executive Director and Head of Fundraising.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
