import type { Metadata } from "next";

import { RedisView } from "@/components/views/RedisView";

export const metadata: Metadata = { title: "Redis" };

export default function Page() {
  return <RedisView />;
}
