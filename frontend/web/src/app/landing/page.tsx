import ThemeTogglerTwo from "@/components/common/ThemeTogglerTwo";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-950 text-white">
      {/* Glowing background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-[-4rem] h-72 w-72 rounded-full bg-purple-500/30 blur-3xl" />
        <div className="absolute bottom-[-6rem] right-[-4rem] h-72 w-72 rounded-full bg-orange-500/30 blur-3xl" />
      </div>

      {/* Floating icons */}
      <div className="pointer-events-none absolute inset-0">
        <span className="floating-icon floating-icon-1">🏋️</span>
        <span className="floating-icon floating-icon-2">🔥</span>
        <span className="floating-icon floating-icon-3">💪</span>
        <span className="floating-icon floating-icon-4">🧘</span>
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-500 shadow-[0_0_30px_rgba(70,95,255,0.7)]">
              <span className="text-lg font-semibold">GH</span>
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-gray-100">
                GymHub
              </p>
              <p className="text-xs text-gray-400">
                All-in-one fitness management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="auth/signin"
              className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-medium text-gray-200 hover:border-brand-400 hover:text-white"
            >
              Login
            </Link>
            <ThemeTogglerTwo />
          </div>
        </header>

        {/* Hero */}
        <section className="mt-16 grid flex-1 items-center gap-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-400/40 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-100 shadow-[0_0_20px_rgba(70,95,255,0.6)]">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Smart workouts • Real-time scheduling • Member analytics
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Power your{" "}
              <span className="bg-gradient-to-r from-brand-200 via-white to-emerald-300 bg-clip-text text-transparent">
                gym experience
              </span>{" "}
              with one modern dashboard.
            </h1>
            <p className="mt-5 max-w-xl text-sm text-gray-300 sm:text-base">
              Manage memberships, coaches, sessions, and payments from a single,
              beautifully crafted interface. Designed for high-energy gyms,
              boutique studios, and fitness communities.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_0_35px_rgba(70,95,255,0.8)] transition hover:bg-brand-400"
              >
                Get started as member
              </Link>
              <Link
                href="/signin"
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-gray-100 backdrop-blur-md transition hover:border-brand-400 hover:text-white"
              >
                Admin / staff login
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                No credit card required
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                API-ready for mobile apps
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
                Dark &amp; Light gym themes
              </div>
            </div>
          </div>

          {/* Right side - glass stats card */}
          <div className="relative">
            <div className="pointer-events-none absolute -right-10 -top-8 h-32 w-32 rounded-full bg-emerald-400/30 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-brand-500/40 blur-3xl" />

            <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.8)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-300">
                    Live gym load
                  </p>
                  <p className="mt-1 text-3xl font-semibold">68%</p>
                  <p className="mt-1 text-xs text-emerald-200">
                    Peak hours · Classes filling fast
                  </p>
                </div>
                <div className="h-20 w-20 rounded-full border border-emerald-400/40 bg-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.8)]" />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-2xl bg-gray-900/70 p-3 text-gray-200">
                  <p className="text-[11px] text-gray-400">Active members</p>
                  <p className="mt-1 text-lg font-semibold">1,248</p>
                  <p className="mt-1 text-[11px] text-emerald-300">+18% this month</p>
                </div>
                <div className="rounded-2xl bg-gray-900/70 p-3 text-gray-200">
                  <p className="text-[11px] text-gray-400">Coaches online</p>
                  <p className="mt-1 text-lg font-semibold">12</p>
                  <p className="mt-1 text-[11px] text-sky-300">4 PT sessions live</p>
                </div>
                <div className="rounded-2xl bg-gray-900/70 p-3 text-gray-200">
                  <p className="text-[11px] text-gray-400">Today&apos;s sessions</p>
                  <p className="mt-1 text-lg font-semibold">54</p>
                  <p className="mt-1 text-[11px] text-orange-300">Spin, HIIT, Yoga</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-gradient-to-r from-brand-500/30 via-purple-500/30 to-emerald-500/30 px-4 py-3 text-xs text-gray-100">
                <p className="font-medium">
                  GymHub for teams
                </p>
                <p className="mt-1 text-[11px] text-gray-100/80">
                  Owners, admins and coaches each get tailored dashboards for members,
                  classes, payments and performance.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features strip */}
        <section className="mt-12 grid gap-4 border-t border-white/10 pt-8 text-xs text-gray-300 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-md">
            <p className="font-semibold text-white">Smart scheduling</p>
            <p className="mt-2 text-[11px] text-gray-300">
              Coordinate classes, PT sessions and coach availability in one calendar.
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-md">
            <p className="font-semibold text-white">Membership analytics</p>
            <p className="mt-2 text-[11px] text-gray-300">
              Understand churn, peak hours and best-performing programs instantly.
            </p>
          </div>
          <div className="rounded-2xl bg-white/5 p-4 backdrop-blur-md">
            <p className="font-semibold text-white">Gym-ready themes</p>
            <p className="mt-2 text-[11px] text-gray-300">
              Switch between a clean light theme and an electric dark theme tailored
              for fitness brands.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

