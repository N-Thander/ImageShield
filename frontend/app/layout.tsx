import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Sidebar } from "@/components/nav/Sidebar";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ImageShield — Live Operations",
    template: "%s · ImageShield",
  },
  description:
    "Live operations dashboard for the ImageShield image moderation pipeline: throughput, latency, cascade stages and backing-service health.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-page text-ink">
        <Providers>
          <div className="flex min-h-dvh">
            <Sidebar />
            <div className="min-w-0 flex-1">{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
