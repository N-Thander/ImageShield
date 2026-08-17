import type { Metadata } from "next";

import { IngestionView } from "@/components/views/IngestionView";

export const metadata: Metadata = { title: "Ingestion" };

export default function Page() {
  return <IngestionView />;
}
