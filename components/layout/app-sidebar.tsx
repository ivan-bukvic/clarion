"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Diff,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClarionMark } from "@/components/layout/clarion-mark";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/compare", label: "Compare", icon: Diff },
] as const;

function NavLinks({
  pathname,
  onNavigate,
  variant,
}: {
  pathname: string;
  onNavigate?: () => void;
  variant: "sidebar" | "mobile";
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        if (variant === "mobile") {
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
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md border-l-2 px-3 py-2.5 text-[13.5px] font-medium transition-colors",
              active
                ? "border-[#E2724C] bg-gradient-to-r from-[#1D5F55] to-[#1B564F] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
                : "border-transparent text-[#9FC2BA] hover:bg-white/5 hover:text-[#EAF3F0]"
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0",
                active ? "text-[#EAF3F0]" : "text-[#7FA69D]"
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", compact ? "" : "px-1")}>
      <ClarionMark className={compact ? "size-7" : "size-11"} />
      <div className="min-w-0 space-y-0.5">
        <p
          className={cn(
            "truncate font-semibold tracking-tight",
            compact ? "text-sm text-foreground" : "text-[15px] text-white"
          )}
        >
          Clarion
        </p>
        <p
          className={cn(
            "truncate text-[10.5px] font-semibold tracking-widest uppercase",
            compact ? "text-muted-foreground" : "text-[#8FB6AC]"
          )}
        >
          Ridgeline Renovations
        </p>
      </div>
    </div>
  );
}

function useCurrentAccount() {
  const [account, setAccount] = useState<{
    label: string;
    email: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!active) return;
        const authUser = data.user;
        if (!authUser?.email) return;
        const metadata = authUser.user_metadata as
          | Record<string, unknown>
          | undefined;
        const displayName =
          (metadata?.full_name as string | undefined) ??
          (metadata?.name as string | undefined) ??
          authUser.email.split("@")[0];
        setAccount({ label: displayName, email: authUser.email });
      });
    return () => {
      active = false;
    };
  }, []);

  return account;
}

function AccountMenu({ variant }: { variant: "sidebar" | "mobile" }) {
  const router = useRouter();
  const account = useCurrentAccount();
  const [signingOut, setSigningOut] = useState(false);
  const initial = account?.label ? account.label.charAt(0).toUpperCase() : "…";

  // TODO: guard against double-click re-entry (if (signingOut) return;) and
  // wrap signOut() in try/catch + finally { setSigningOut(false) } with a
  // visible error on failure — currently a failed signOut() leaves the
  // button disabled forever with no feedback.
  async function handleSignOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (variant === "mobile") {
    return (
      <div className="flex items-center gap-2.5 border-t px-2 pt-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-foreground">
            {account?.label ?? "Loading…"}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {account?.email ?? ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          title="Sign out"
          aria-label="Sign out"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-auto flex items-center gap-2.5 border-t border-white/10 px-1 pt-3.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-[#1B564F] text-xs font-semibold text-[#EAF3F0]">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold text-[#EAF3F0]">
          {account?.label ?? "Loading…"}
        </p>
        <p className="truncate text-[11px] text-[#7FA69D]">
          {account?.email ?? ""}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        title="Sign out"
        aria-label="Sign out"
        className="flex size-6 shrink-0 items-center justify-center rounded-md text-[#7FA69D] transition-colors hover:bg-white/10 hover:text-[#EAF3F0] disabled:opacity-50"
      >
        <LogOut className="size-3.5" />
      </button>
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
        <div className="flex shrink-0 flex-col gap-3 border-b px-2 py-3 md:hidden">
          <NavLinks
            pathname={pathname}
            onNavigate={() => setMobileOpen(false)}
            variant="mobile"
          />
          <AccountMenu variant="mobile" />
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="relative hidden w-56 shrink-0 flex-col gap-6 overflow-hidden bg-clarion-sidebar-gradient px-3.5 py-5 shadow-[2px_0_14px_rgba(0,0,0,0.12)] md:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 size-52 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(226,114,76,0.16), transparent 70%)",
          }}
        />
        <div className="relative">
          <BrandBlock />
        </div>
        <div className="relative flex-1">
          <NavLinks pathname={pathname} variant="sidebar" />
        </div>
        <div className="relative">
          <AccountMenu variant="sidebar" />
        </div>
      </aside>
    </>
  );
}
