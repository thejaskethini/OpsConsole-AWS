import type { Metadata } from "next";
import "./globals.css";
import { ClientLayout } from "@/components/ClientLayout";

export const metadata: Metadata = {
  title: "OpsConsole — Cloud SRE Platform",
  description: "Production-grade Cloud Observability and SRE Platform",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased h-screen overflow-hidden flex">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
