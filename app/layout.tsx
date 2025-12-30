import type { Metadata } from "next";
import "./globals.css";
import { EventsProvider } from "@/providers";
import { DashboardShell } from "@/components/layout";

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
      <body>
        <EventsProvider>
          <DashboardShell>{children}</DashboardShell>
        </EventsProvider>
      </body>
    </html>
  );
}
