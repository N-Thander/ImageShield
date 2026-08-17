"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { useServices } from "@/components/providers/ServicesProvider";
import { StatusDot } from "@/components/ui/Pills";
import { cn } from "@/lib/cn";
import { navItems } from "@/lib/nav";

function HealthCard() {
  const { upCount, totalCount, overall, loading } = useServices();

  return (
    <div className="rounded-xl border border-hairline/70 bg-primary-50/60 p-3">
      <div className="flex items-center gap-2">
        <StatusDot status={overall} pulse />
        <span className="hidden text-xs font-semibold text-ink lg:inline">
          {loading ? "Checking services…" : `${upCount} of ${totalCount} services up`}
        </span>
      </div>
      <p className="mt-1 hidden text-[11px] leading-relaxed text-muted lg:block">
        {overall === "unknown"
          ? "Service metrics endpoints are not reporting yet."
          : "Polled every 20s from /services."}
      </p>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh w-[68px] shrink-0 flex-col border-r border-hairline/70 bg-card",
        "px-2 py-5 lg:w-[240px] lg:px-4",
      )}
    >
      <Link
        href="/"
        className="flex items-center justify-center gap-2.5 rounded-xl px-1 py-1 lg:justify-start"
        aria-label="ImageShield — live overview"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-card">
          <ShieldCheck className="size-5 text-white" aria-hidden="true" />
        </span>
        <span className="hidden text-[15px] font-bold tracking-tight text-ink lg:inline">
          ImageShield
        </span>
      </Link>

      <nav aria-label="Services" className="mt-7 min-h-0 flex-1 overflow-y-auto scroll-slim">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  title={item.label}
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl py-2.5 text-sm transition-colors duration-200",
                    "justify-center px-0 lg:justify-start lg:px-3",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500",
                    active
                      ? "bg-primary-100 font-semibold text-primary-700"
                      : "font-medium text-muted hover:bg-primary-50 hover:text-primary-700",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-primary-500"
                    />
                  )}
                  <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                  <span className="hidden truncate lg:inline">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-4 shrink-0">
        <HealthCard />
      </div>
    </aside>
  );
}
