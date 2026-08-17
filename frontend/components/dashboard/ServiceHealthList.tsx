"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/Card";
import { StatusDot } from "@/components/ui/Pills";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useServices } from "@/components/providers/ServicesProvider";
import { EM_DASH } from "@/lib/format";

export function ServiceHealthList() {
  const { services, loading, upCount, totalCount } = useServices();

  return (
    <Card aria-labelledby="health-heading" className="flex flex-col gap-4">
      <CardHeader
        id="health-heading"
        title="Service health"
        hint={loading && services.length === 0 ? "Checking…" : `${upCount}/${totalCount} reporting`}
      />

      {services.length === 0 ? (
        <SkeletonRows rows={4} />
      ) : (
        <ul className="flex flex-col gap-1">
          {services.map((service) => (
            <li key={service.key}>
              <Link
                href={service.href}
                className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors duration-200 hover:bg-primary-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
              >
                <StatusDot status={service.status} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium text-ink">
                    {service.label}
                  </span>
                  <span className="block truncate text-[11px] text-muted">
                    {service.detail ?? (service.error ? "no data yet" : EM_DASH)}
                  </span>
                </span>
                <span className="ml-auto inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary-600 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  View
                  <ArrowUpRight className="size-3" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
