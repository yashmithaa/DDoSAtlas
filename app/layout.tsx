import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DDoSAtlas",
  description: "Global malicious IP activity visualization",
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
