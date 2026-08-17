import type { Metadata } from "next";

import { QueueView } from "@/components/views/QueueView";

export const metadata: Metadata = { title: "Kafka / Redpanda" };

export default function Page() {
  return <QueueView />;
}
