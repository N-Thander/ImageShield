"use client";

import { LiveProvider } from "@/components/providers/LiveProvider";
import { ServicesProvider } from "@/components/providers/ServicesProvider";

/**
 * Both providers are mounted at the root so the sidebar's health card and the
 * dashboard cards share one WebSocket and one polling loop between them.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ServicesProvider>
      <LiveProvider>{children}</LiveProvider>
    </ServicesProvider>
  );
}
