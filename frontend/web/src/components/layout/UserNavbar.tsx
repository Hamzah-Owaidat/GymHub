"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useAuthStore } from "@/store/authStore";

const NAV_MEMBER = [
  { href: "/", label: "Home" },
  { href: "/gyms", label: "Gyms" },
  { href: "/sessions", label: "Sessions" },
  { href: "/chat", label: "Chat" },
  { href: "/profile", label: "Profile" },
];

const NAV_STAFF = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
];

const STAFF_ROLES = ["admin", "owner", "coach"];

export default function UserNavbar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const effectiveIsAuthenticated = hydrated && isAuthenticated;
  const effectiveUserRole = hydrated ? user?.role : undefined;
  const isStaff =
    effectiveUserRole && STAFF_ROLES.includes(effectiveUserRole);
  const navLinks =
    isStaff && effectiveUserRole === "coach"
      ? [...NAV_STAFF, { href: "/dashboard/coach/chat", label: "Chat" }]
      : isStaff
      ? NAV_STAFF
      : NAV_MEMBER;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-stone-200/60 bg-white/70 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-xl dark:border-stone-800/60 dark:bg-stone-950/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-orange-600 text-sm font-bold text-white shadow-[0_0_24px_rgba(249,115,22,0.5)]">
            G
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-stone-900 dark:text-white">
            GymHub
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {navLinks.map(({ href, label }) => {
            const active =
              pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`relative rounded-lg px-3.5 py-2 text-[13px] font-medium transition-all ${
                  active
                    ? "text-brand-600 dark:text-brand-400"
                    : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
                }`}
              >
                {label}
                {active && (
                  <span className="absolute inset-x-2 -bottom-[17px] h-[2px] rounded-full bg-brand-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggleButton />
          {effectiveIsAuthenticated && <NotificationDropdown />}
          {effectiveIsAuthenticated ? (
            <UserDropdown />
          ) : (
            <Link
              href="/auth/signin"
              className="rounded-lg bg-brand-500 px-4 py-1.5 text-xs font-medium text-white shadow-[0_0_16px_rgba(249,115,22,0.3)] transition hover:bg-brand-600"
            >
              Sign In
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 md:hidden dark:hover:bg-stone-800"
          >
            {mobileOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-stone-200/60 bg-white/95 px-4 pb-4 pt-2 backdrop-blur-xl md:hidden dark:border-stone-800 dark:bg-stone-950/95">
          {navLinks.map(({ href, label }) => {
            const active =
              pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active
                    ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    : "text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-900"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
