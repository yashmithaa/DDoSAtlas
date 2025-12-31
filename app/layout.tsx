import type { Metadata, Viewport } from "next";
import "./globals.css";
import { EventsProvider } from "@/providers";
import { DashboardShell } from "@/components/layout";

export const metadata: Metadata = {
  title: "DDoSAtlas",
  description: "Global malicious IP activity visualization",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <EventsProvider>
          <DashboardShell>{children}</DashboardShell>
        </EventsProvider>
      </body>
    </html>
  );
}
