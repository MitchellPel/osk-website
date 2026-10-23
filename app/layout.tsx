import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OSK | Private staging",
  description: "Private staging catalogue for OSK emergency lever kits.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-ZA">
      <body>{children}</body>
    </html>
  );
}
