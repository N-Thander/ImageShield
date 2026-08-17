import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { GRAFANA_URL } from "@/lib/env";
import { navItemFor } from "@/lib/nav";

export const metadata: Metadata = { title: "Grafana" };

export default function GrafanaPage() {
  const nav = navItemFor("/grafana");

  return (
    <PageShell className="lg:h-dvh">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Grafana</h1>
          {nav && <p className="mt-1 text-sm text-muted">{nav.blurb}</p>}
        </div>

        <a
          href={GRAFANA_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-card transition-colors hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          Open in Grafana
          <ExternalLink className="size-3.5" aria-hidden="true" />
        </a>
      </header>

      <Card className="flex min-h-0 flex-1 flex-col gap-3 p-3">
        <iframe
          src={GRAFANA_URL}
          title="Grafana dashboard"
          loading="lazy"
          className="h-[calc(100dvh-260px)] min-h-[480px] w-full rounded-xl border border-hairline bg-page lg:h-full"
        />
      </Card>

      <p className="text-xs leading-relaxed text-muted">
        Embedding is served from <code className="font-mono">{GRAFANA_URL}</code>. If the frame stays
        blank, Grafana is refusing to be framed — set{" "}
        <code className="font-mono">GF_SECURITY_ALLOW_EMBEDDING=true</code> (and{" "}
        <code className="font-mono">GF_AUTH_ANONYMOUS_ENABLED=true</code> for a login-free view) on
        the Grafana container, then use the button above as a fallback.
      </p>
    </PageShell>
  );
}
