"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getPublicGyms, type PublicGym } from "@/lib/api/userGyms";
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

function GymCard({ gym }: { gym: PublicGym }) {
  const [index, setIndex] = useState(0);
  const images = gym.images || [];
  const hasImages = images.length > 0;
  const current = hasImages ? images[index] : null;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-1 hover:shadow-lg dark:border-stone-800 dark:bg-stone-900">
      <div className="relative h-52 overflow-hidden bg-stone-100 dark:bg-stone-800">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImg(current.image_url)}
            alt={gym.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-stone-400">
            <svg className="mr-1.5 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v11.25c0 1.242 1.008 2.25 2.25 2.25z" /></svg>
            No image
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

        {hasImages && images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIndex((i) => (i - 1 + images.length) % images.length);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 text-stone-700 opacity-0 shadow-md backdrop-blur-sm transition group-hover:opacity-100 hover:bg-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setIndex((i) => (i + 1) % images.length);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 text-stone-700 opacity-0 shadow-md backdrop-blur-sm transition group-hover:opacity-100 hover:bg-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </button>

            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition ${
                    i === index ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {gym.rating_average != null &&
          !Number.isNaN(Number(gym.rating_average)) && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-white/90 px-2 py-1 text-[11px] font-semibold text-stone-800 backdrop-blur-sm dark:bg-stone-900/90 dark:text-stone-200">
              <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              {Number(gym.rating_average).toFixed(1)}
            </span>
          )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[15px] font-semibold text-stone-900 group-hover:text-brand-500 dark:text-white dark:group-hover:text-brand-400">
          {gym.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-stone-500 dark:text-stone-400">
          {gym.description || "Modern gym with flexible plans."}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
            {gym.location || "No location"}
          </span>
          <Link
            href={`/gyms/${gym.id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 transition hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-400 dark:hover:bg-brand-950/60"
          >
            View
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function GymsPage() {
  const { error: showError } = useToast();
  const [gyms, setGyms] = useState<PublicGym[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async (q: string) => {
    setLoading(true);
    try {
      const res = await getPublicGyms({ page: 1, limit: 24, search: q || undefined });
      setGyms(res.data);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to load gyms");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (v: string) => {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
            Explore
          </p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900 sm:text-3xl dark:text-white">
            Browse Gyms
          </h1>
          <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
            Discover active gyms and find the perfect place for your training.
          </p>
        </div>

        <div className="relative w-full max-w-xs">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search gyms..."
            className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-4 text-sm text-stone-800 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-800"
              />
            ))}
          </div>
        ) : gyms.length === 0 ? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
            <svg className="mb-3 h-12 w-12 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>
            <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
              No gyms found
            </p>
            <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
              Try a different search or check back later.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gyms.map((gym) => (
              <GymCard key={gym.id} gym={gym} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
