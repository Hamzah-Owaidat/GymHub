"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "@/components/header/NotificationDropdown";
import UserDropdown from "@/components/header/UserDropdown";
import { useAuthStore } from "@/store/authStore";

const NAV_MEMBER = [
  { href: "/", label: "Home" },
  { href: "/gyms", label: "Gyms" },
  { href: "/sessions", label: "Sessions" },
];

const NAV_STAFF = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
];

const STAFF_ROLES = ["admin", "owner", "coach"];

export default function UserNavbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isStaff = user?.role && STAFF_ROLES.includes(user.role);
  const navLinks = isStaff ? NAV_STAFF : NAV_MEMBER;
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-stone-200/80 bg-white/80 shadow-sm backdrop-blur-md dark:border-stone-700/80 dark:bg-stone-900/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-90"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            GH
          </div>
          <span className="text-base font-semibold text-stone-800 dark:text-stone-100">
            GymHub
          </span>
        </Link>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-500/10 text-brand-600 dark:text-brand-400"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: theme + notification + profile dropdown */}
        <div className="flex items-center gap-3">
          <ThemeToggleButton />
          <NotificationDropdown />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
