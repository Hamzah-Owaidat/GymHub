"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useTheme } from "@/context/ThemeContext";
import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

function getProfileImageUrl(profileImage: string | null | undefined): string | null {
  if (!profileImage?.trim()) return null;
  if (profileImage.startsWith("http")) return profileImage;
  const base = API_BASE.replace(/\/$/, "");
  const path = profileImage.startsWith("/") ? profileImage : `/${profileImage}`;
  return path.startsWith("/storage") ? `${base}${path}` : `${base}/storage/${profileImage.replace(/^\//, "")}`;
}

function getInitials(firstName?: string, lastName?: string): string {
  const first = (firstName || "").trim();
  const second = (lastName || "").trim();
  const a = first.slice(0, 1).toUpperCase();
  const b = second.slice(0, 1).toUpperCase();
  if (a && b) return `${a}${b}`;
  if (a) return a;
  if (b) return b;
  return "U";
}

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
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const isStaff = user?.role && STAFF_ROLES.includes(user.role);
  const navLinks = isStaff ? NAV_STAFF : NAV_MEMBER;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    clearAuth();
    router.push("/");
  };

  const profileImageUrl = user ? getProfileImageUrl(user.profile_image) : null;
  const initials = user ? getInitials(user.first_name, user.last_name) : "U";

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

        {/* Right: theme + profile dropdown */}
        <div className="flex items-center gap-3">
          <ThemeTogglerTwo />

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 rounded-xl outline-none ring-2 ring-transparent transition-all focus:ring-brand-500/50 focus-visible:ring-2"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-500/20 text-sm font-semibold text-brand-700 dark:bg-brand-500/30 dark:text-brand-300">
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials
                )}
              </span>
              <svg
                className={`h-4 w-4 text-stone-500 transition-transform dark:text-stone-400 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown panel */}
            <div
              className={`absolute right-0 top-full mt-2 min-w-[200px] origin-top-right rounded-2xl border border-stone-200/90 bg-white py-1.5 shadow-xl shadow-stone-900/10 transition-all duration-200 ease-out dark:border-stone-700/90 dark:bg-stone-800 dark:shadow-stone-950/50 ${
                dropdownOpen
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-95 opacity-0"
              }`}
              role="menu"
            >
              <div className="border-b border-stone-100 px-4 py-3 dark:border-stone-700">
                <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                  {user?.email}
                </p>
              </div>
              <Link
                href="/profile"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 transition-colors hover:bg-stone-50 hover:text-brand-600 dark:text-stone-200 dark:hover:bg-stone-700 dark:hover:text-brand-400"
                role="menuitem"
              >
                <svg
                  className="h-4 w-4 text-stone-400 dark:text-stone-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-stone-700 dark:hover:bg-red-950/30"
                role="menuitem"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
