import type { Metadata } from "next";

import { StorageView } from "@/components/views/StorageView";

export const metadata: Metadata = { title: "MinIO" };

export default function Page() {
  return <StorageView />;
}
