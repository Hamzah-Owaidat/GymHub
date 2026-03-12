"use client";

import Link from "next/link";

const FOOTER_LINKS = {
  Platform: [
    { label: "Browse Gyms", href: "/gyms" },
    { label: "My Sessions", href: "/sessions" },
    { label: "My Profile", href: "/profile" },
  ],
  Resources: [
    { label: "Help Center", href: "#" },
    { label: "Q&A", href: "#" },
    { label: "Blog", href: "#" },
  ],
  Legal: [
    { label: "Terms of Service", href: "#" },
    { label: "Privacy Policy", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
};

export default function UserFooter() {
  return (
    <footer className="mt-16 border-t border-stone-200/60 bg-stone-50/80 dark:border-stone-800/60 dark:bg-stone-950/80">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-orange-600 text-xs font-bold text-white">
                G
              </div>
              <span className="text-sm font-semibold text-stone-900 dark:text-white">
                GymHub
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-stone-500 dark:text-stone-400">
              Discover the best gyms near you, subscribe to flexible plans, book
              sessions with expert coaches, and track your fitness journey — all
              in one place.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
                {title}
              </p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-stone-600 transition-colors hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-stone-200/60 pt-6 sm:flex-row dark:border-stone-800/60">
          <p className="text-[11px] text-stone-400 dark:text-stone-500">
            &copy; {new Date().getFullYear()} GymHub by Bilal Madani. All rights
            reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557a9.83 9.83 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724 9.864 9.864 0 0 1-3.127 1.195A4.916 4.916 0 0 0 16.616 2c-2.72 0-4.924 2.204-4.924 4.924 0 .386.044.762.128 1.124C7.728 7.83 4.1 5.868 1.671 2.9a4.822 4.822 0 0 0-.666 2.475c0 1.708.869 3.216 2.19 4.099a4.904 4.904 0 0 1-2.23-.616v.062a4.923 4.923 0 0 0 3.946 4.827 4.996 4.996 0 0 1-2.224.085 4.937 4.937 0 0 0 4.604 3.417A9.868 9.868 0 0 1 0 19.54a13.94 13.94 0 0 0 7.548 2.212c9.057 0 14.01-7.503 14.01-14.01 0-.213-.005-.425-.014-.636A10.012 10.012 0 0 0 24 4.557z" /></svg>
            </a>
            <a href="#" className="text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" /></svg>
            </a>
            <a href="#" className="text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.024-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM6.899 20.452H3.775V9h3.124v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
