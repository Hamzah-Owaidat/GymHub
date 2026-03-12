"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getPublicGyms, type PublicGym } from "@/lib/api/userGyms";
import { getUserSubscriptions } from "@/lib/api/userSubscriptions";
import { apiClient } from "@/lib/axios";
import { useToast } from "@/context/ToastContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

function resolveImg(url: string): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const p =
    url.startsWith("/storage") || url.startsWith("storage")
      ? url.replace(/^storage/, "/storage")
      : `/storage/gym/${url.replace(/^\/+/, "")}`;
  return `${API_BASE_URL}${p}`;
}

const STEPS = [
  {
    num: "01",
    title: "Find Your Gym",
    desc: "Browse a curated list of partner gyms, compare prices and amenities, and pick the perfect spot.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
    ),
  },
  {
    num: "02",
    title: "Subscribe & Pay",
    desc: "Choose a plan, pay with card or cash — your membership and payments are tracked automatically.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
    ),
  },
  {
    num: "03",
    title: "Train & Track",
    desc: "Book sessions with certified coaches, check your weekly calendar, and stay on top of your fitness goals.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
    ),
  },
];

export default function HomeContent() {
  const { user, isAuthenticated } = useAuthStore();
  const { error: showError, success: showSuccess } = useToast();
  const firstName = user?.first_name || "there";

  const [featuredGyms, setFeaturedGyms] = useState<PublicGym[]>([]);
  const [subsCount, setSubsCount] = useState(0);
  const [gymsCount, setGymsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const gymsRes = await getPublicGyms({ page: 1, limit: 6 });
        setFeaturedGyms(gymsRes.data);
        setGymsCount(gymsRes.pagination?.total || gymsRes.data.length);
        if (isAuthenticated) {
          const subsRes = await getUserSubscriptions();
          setSubsCount(subsRes.data.length);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthenticated]);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.message.trim()) {
      showError("Please write a short message.");
      return;
    }
    setContactLoading(true);
    try {
      await apiClient.post("/api/user/contact", contactForm);
      setContactForm({ name: "", email: "", subject: "", message: "" });
      showSuccess("Message sent. We'll get back to you soon.");
    } catch {
      showError("Failed to send message");
    } finally {
      setContactLoading(false);
    }
  };

  return (
    <div className="overflow-hidden">
      {/* ─── Hero ─── */}
      <section className="relative isolate overflow-hidden bg-white dark:bg-stone-950">
        <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-brand-400/30 via-orange-400/20 to-transparent blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 right-0 -z-10 h-[320px] w-[480px] rounded-full bg-gradient-to-tl from-brand-500/20 to-transparent blur-[100px]" />

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="max-w-xl">
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:border-brand-800 dark:bg-brand-950/50 dark:text-brand-400">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Your fitness journey starts here
              </span>
              <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight text-stone-900 sm:text-5xl lg:text-[3.25rem] dark:text-white">
                {isAuthenticated ? (
                  <>
                    Welcome back,{" "}
                    <span className="bg-gradient-to-r from-brand-500 to-orange-500 bg-clip-text text-transparent">
                      {firstName}
                    </span>
                  </>
                ) : (
                  <>
                    Find, Subscribe &{" "}
                    <span className="bg-gradient-to-r from-brand-500 to-orange-500 bg-clip-text text-transparent">
                      Train
                    </span>
                  </>
                )}
              </h1>
              <p className="mt-5 text-base leading-relaxed text-stone-600 sm:text-lg dark:text-stone-400">
                Discover top-rated gyms near you, subscribe to flexible plans,
                and book personalized sessions with expert coaches — all in one
                place.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/gyms"
                  className="inline-flex items-center rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-brand-500/40"
                >
                  Browse Gyms
                  <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
                </Link>
                {isAuthenticated && (
                  <Link
                    href="/sessions"
                    className="inline-flex items-center rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 transition-all hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    My Sessions
                  </Link>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="group rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-950/50">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>
                </div>
                <p className="text-3xl font-bold text-stone-900 dark:text-white">
                  {loading ? "..." : gymsCount}
                </p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Active gyms
                </p>
              </div>

              <div className="group rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-950/50">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-3xl font-bold text-stone-900 dark:text-white">
                  {isAuthenticated ? subsCount : "—"}
                </p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Your subscriptions
                </p>
              </div>

              <div className="group rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-500 dark:bg-violet-950/50">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                </div>
                <p className="text-3xl font-bold text-stone-900 dark:text-white">
                  50+
                </p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Expert coaches
                </p>
              </div>

              <div className="group rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-950/50">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                </div>
                <p className="text-3xl font-bold text-stone-900 dark:text-white">
                  4.8
                </p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Average rating
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Featured Gyms ─── */}
      <section className="bg-stone-50/60 py-16 dark:bg-stone-900/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
                Explore
              </p>
              <h2 className="mt-1 text-2xl font-bold text-stone-900 sm:text-3xl dark:text-white">
                Featured Gyms
              </h2>
            </div>
            <Link
              href="/gyms"
              className="hidden items-center gap-1 text-sm font-medium text-brand-500 transition hover:text-brand-600 sm:inline-flex"
            >
              View all
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>

          {loading ? (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800"
                />
              ))}
            </div>
          ) : featuredGyms.length === 0 ? (
            <p className="mt-8 text-sm text-stone-500">
              No gyms available yet. Check back soon.
            </p>
          ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredGyms.slice(0, 6).map((g) => {
                const img =
                  g.images && g.images.length > 0
                    ? resolveImg(g.images[0].image_url)
                    : "";
                return (
                  <Link
                    key={g.id}
                    href={`/gyms/${g.id}`}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-lg dark:border-stone-800 dark:bg-stone-900"
                  >
                    <div className="relative h-44 bg-stone-100 dark:bg-stone-800">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt={g.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-stone-400">
                          No image
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      {g.rating_average != null &&
                        !Number.isNaN(Number(g.rating_average)) && (
                          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-semibold text-stone-800 backdrop-blur-sm dark:bg-stone-900/90 dark:text-stone-200">
                            <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            {Number(g.rating_average).toFixed(1)}
                          </span>
                        )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-[15px] font-semibold text-stone-900 group-hover:text-brand-500 dark:text-white dark:group-hover:text-brand-400">
                        {g.name}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-sm text-stone-500 dark:text-stone-400">
                        {g.description || "Modern gym with flexible plans."}
                      </p>
                      <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-stone-400 dark:text-stone-500">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                        {g.location || "No location"}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="mt-8 text-center sm:hidden">
            <Link
              href="/gyms"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-500"
            >
              View all gyms
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
              Simple & Fast
            </p>
            <h2 className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl dark:text-white">
              How GymHub Works
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-stone-500 dark:text-stone-400">
              Three easy steps from browsing to training. No hassle, no
              paperwork.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="group relative rounded-2xl border border-stone-200/80 bg-white p-7 transition-all hover:shadow-lg dark:border-stone-800 dark:bg-stone-900"
              >
                <span className="absolute -top-3.5 left-6 flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-xs font-bold text-white shadow-lg shadow-brand-500/30">
                  {step.num}
                </span>
                <div className="mb-4 mt-2 text-stone-400 group-hover:text-brand-500 dark:text-stone-500">
                  {step.icon}
                </div>
                <h3 className="text-[15px] font-semibold text-stone-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 px-8 py-14 text-center sm:py-20 dark:from-stone-950 dark:to-black">
          <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-brand-500/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-orange-500/15 blur-[100px]" />
          <h2 className="relative text-2xl font-bold text-white sm:text-3xl">
            Ready to start your fitness journey?
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-sm text-stone-400">
            Join thousands of members who train smarter with GymHub. Your
            perfect gym is one click away.
          </p>
          <div className="relative mt-8 flex justify-center gap-3">
            <Link
              href="/gyms"
              className="inline-flex items-center rounded-xl bg-brand-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600"
            >
              Get Started Free
            </Link>
            <Link
              href="#contact"
              className="inline-flex items-center rounded-xl border border-stone-700 px-7 py-3 text-sm font-semibold text-stone-300 transition hover:bg-stone-800"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Contact ─── */}
      <section id="contact" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
                Get in Touch
              </p>
              <h2 className="mt-2 text-2xl font-bold text-stone-900 sm:text-3xl dark:text-white">
                Have a question?
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
                Whether you need help with your account, want to suggest a
                feature, or need to report an issue — we&apos;re here to help
                and usually respond within 1-2 business days.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  {
                    icon: (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                    ),
                    label: "support@gymhub.com",
                  },
                  {
                    icon: (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    ),
                    label: "Algiers, Algeria",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 text-sm text-stone-600 dark:text-stone-400"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-950/40">
                      {item.icon}
                    </div>
                    {item.label}
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={handleContact}
              className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-8 dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-400">
                    Name
                  </label>
                  <input
                    type="text"
                    value={contactForm.name}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 text-sm text-stone-800 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-400">
                    Email
                  </label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) =>
                      setContactForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 text-sm text-stone-800 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-400">
                  Subject
                </label>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, subject: e.target.value }))
                  }
                  className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 text-sm text-stone-800 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  placeholder="How can we help?"
                />
              </div>
              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-400">
                  Message
                </label>
                <textarea
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm((f) => ({ ...f, message: e.target.value }))
                  }
                  className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2.5 text-sm text-stone-800 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  placeholder="Tell us about your request..."
                />
              </div>
              <div className="mt-5 flex items-center justify-between">
                <p className="text-[11px] text-stone-400">
                  We&apos;ll never share your contact details.
                </p>
                <button
                  type="submit"
                  disabled={contactLoading}
                  className="inline-flex items-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-60"
                >
                  {contactLoading ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
