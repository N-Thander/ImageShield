import type { Metadata } from "next";

import { PostgresView } from "@/components/views/PostgresView";

export const metadata: Metadata = { title: "Postgres" };

export default function Page() {
  return <PostgresView />;
}
