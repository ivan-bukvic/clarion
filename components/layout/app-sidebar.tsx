"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Diff,
  LayoutDashboard,
  Menu,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClarionMark } from "@/components/layout/clarion-mark";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/compare", label: "Compare", icon: Diff },
] as const;

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md border-l-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", compact ? "" : "px-3")}>
      <ClarionMark className={compact ? "size-7 text-xs" : undefined} />
      <div className="min-w-0 space-y-0.5">
        <p
          className={cn(
            "truncate font-semibold tracking-tight",
            compact ? "text-sm" : "text-base"
          )}
        >
          Clarion
        </p>
        <p
          className={cn(
            "truncate text-[11px] text-muted-foreground",
            compact ? "" : "font-medium tracking-wide uppercase"
          )}
        >
          Ridgeline Renovations
        </p>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 md:hidden">
        <BrandBlock compact />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {mobileOpen ? (
        <div className="shrink-0 border-b px-2 py-3 md:hidden">
          <NavLinks
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col gap-6 border-r bg-muted/20 py-6 md:flex">
        <BrandBlock />
        <div className="px-2">
          <NavLinks pathname={pathname} />
        </div>
      </aside>
    </>
  );
}
