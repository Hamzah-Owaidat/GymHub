"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getGymDetails } from "@/lib/api/userGyms";
import { createUserSubscription } from "@/lib/api/userSubscriptions";
import {
  bookSession,
  getCoachDateAvailability,
  type CoachDateAvailabilityResponse,
} from "@/lib/api/userSessions";
import { rateGym, getGymRatings, type GymRating } from "@/lib/api/userRatings";
import { getUserCards, type SavedCard } from "@/lib/api/userCards";
import { useToast } from "@/context/ToastContext";
import { useAuthStore } from "@/store/authStore";
import StarRating from "@/components/ui/StarRating";

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

type PaymentMethod = "cash" | "card";
type OptionalPaymentMethod = PaymentMethod | "";
type SessionVisibility = "private" | "public";

function toMinutes(time: string): number | null {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minuteToTime(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const WEEK_DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const WEEK_DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export default function GymDetailsPage() {
  const params = useParams();
  const idParam = params?.id as string | undefined;
  const gymId = idParam ? Number(idParam) : NaN;
  const { error: showError, success: showSuccess } = useToast();
  const { isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [gym, setGym] = useState<any | null>(null);
  const [images, setImages] = useState<{ id: number; image_url: string }[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [currentImg, setCurrentImg] = useState(0);
  const [activeSub, setActiveSub] = useState<any | null>(null);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);

  // Subscribe state
  const [subSavedCardId, setSubSavedCardId] = useState<number | null>(null);
  const [subscribePlanId, setSubscribePlanId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [savingSub, setSavingSub] = useState(false);

  // Booking state
  const [showBooking, setShowBooking] = useState(false);
  const [bookCoachId, setBookCoachId] = useState<number | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [bookStart, setBookStart] = useState("");
  const [bookEnd, setBookEnd] = useState("");
  const [bookVisibility, setBookVisibility] = useState<SessionVisibility>("private");
  const [bookPayMethod, setBookPayMethod] = useState<OptionalPaymentMethod>("");
  const [bookSavedCardId, setBookSavedCardId] = useState<number | null>(null);
  const [bookCardName, setBookCardName] = useState("");
  const [bookCardNumber, setBookCardNumber] = useState("");
  const [bookCardExpiry, setBookCardExpiry] = useState("");
  const [bookCardCvv, setBookCardCvv] = useState("");
  const [bookingSaving, setBookingSaving] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityInfo, setAvailabilityInfo] = useState<CoachDateAvailabilityResponse | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Rating state
  const [userRating, setUserRating] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSaving, setRatingSaving] = useState(false);
  const [ratingAvg, setRatingAvg] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [reviews, setReviews] = useState<GymRating[]>([]);
  const bookingPaymentInvalid =
    bookPayMethod === "" ||
    (bookPayMethod === "card" && !bookSavedCardId && bookCardNumber.trim().length < 4);

  const availableStartOptions = (() => {
    if (!availabilityInfo) return [];
    const options: Array<{ time: string; slot_mode: "private_only" | "public_only" | "both" }> = [];
    for (const window of availabilityInfo.available_windows || []) {
      const start = toMinutes(window.start_time);
      const end = toMinutes(window.end_time);
      if (start === null || end === null) continue;
      for (let current = start; current + 30 <= end; current += 30) {
        options.push({ time: minuteToTime(current), slot_mode: window.slot_mode });
      }
    }
    const map = new Map<string, "private_only" | "public_only" | "both">();
    options.forEach((opt) => {
      if (!map.has(opt.time)) {
        map.set(opt.time, opt.slot_mode);
      }
    });
    return Array.from(map.entries()).map(([time, slot_mode]) => ({ time, slot_mode }));
  })();

  const availableEndOptions = (() => {
    if (!availabilityInfo || !bookStart) return [];
    const startMinute = toMinutes(bookStart);
    if (startMinute === null) return [];
    const options: Array<{ time: string; slot_mode: "private_only" | "public_only" | "both" }> = [];
    for (const window of availabilityInfo.available_windows || []) {
      const windowStart = toMinutes(window.start_time);
      const windowEnd = toMinutes(window.end_time);
      if (windowStart === null || windowEnd === null) continue;
      if (startMinute < windowStart || startMinute >= windowEnd) continue;
      for (let current = startMinute + 30; current <= windowEnd; current += 30) {
        options.push({ time: minuteToTime(current), slot_mode: window.slot_mode });
      }
    }
    const map = new Map<string, "private_only" | "public_only" | "both">();
    options.forEach((opt) => {
      if (!map.has(opt.time)) {
        map.set(opt.time, opt.slot_mode);
      }
    });
    return Array.from(map.entries()).map(([time, slot_mode]) => ({ time, slot_mode }));
  })();

  const selectedWindowMode = (() => {
    if (!availabilityInfo || !bookStart || !bookEnd) return null;
    const startMinute = toMinutes(bookStart);
    const endMinute = toMinutes(bookEnd);
    if (startMinute === null || endMinute === null) return null;
    const match = (availabilityInfo.available_windows || []).find((window) => {
      const wStart = toMinutes(window.start_time);
      const wEnd = toMinutes(window.end_time);
      return wStart !== null && wEnd !== null && startMinute >= wStart && endMinute <= wEnd;
    });
    return match ? match.slot_mode : null;
  })();

  const selectedCoach = coaches.find((c) => c.id === bookCoachId) || null;
  const selectedCoachPrice = selectedCoach
    ? Number(selectedCoach.price_per_session || 0)
    : (gym?.session_price ? Number(gym.session_price) : 0);
  const selectedCoachGymShare = selectedCoach
    ? Number(selectedCoach.gym_share_percentage || 0)
    : 0;
  const gymShareAmount = +(selectedCoachPrice * selectedCoachGymShare / 100).toFixed(2);
  const coachNetAmount = +(selectedCoachPrice - gymShareAmount).toFixed(2);
  const coachAvailableDays = new Set<string>(
    (selectedCoach?.availability || []).map((slot: any) => String(slot.day || "").toLowerCase()),
  );
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayIso = formatDateIso(todayStart);
  const monthStartDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
  const monthDaysCount = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const monthStartOffset = monthStartDay.getDay();
  const calendarCells: Array<{ date: Date | null }> = [];
  for (let i = 0; i < monthStartOffset; i += 1) calendarCells.push({ date: null });
  for (let day = 1; day <= monthDaysCount; day += 1) {
    calendarCells.push({ date: new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day) });
  }
  while (calendarCells.length % 7 !== 0) calendarCells.push({ date: null });

  useEffect(() => {
    if (!bookCoachId) {
      setBookDate("");
      setCalendarMonth(new Date(todayStart.getFullYear(), todayStart.getMonth(), 1));
      return;
    }
    if (!bookDate) return;
    const selectedDate = new Date(`${bookDate}T00:00:00`);
    if (!Number.isNaN(selectedDate.getTime())) {
      setCalendarMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [bookCoachId, bookDate]);

  useEffect(() => {
    if (!gymId || Number.isNaN(gymId)) return;
    (async () => {
      try {
        const res = await getGymDetails(gymId);
        setGym(res.gym);
        setImages(res.images || []);
        setPlans(res.plans || []);
        setCoaches(res.coaches || []);
        setActiveSub(res.activeSubscription || null);
        setRatingAvg(Number(res.gym.rating_average) || 0);
        setRatingCount(Number(res.gym.rating_count) || 0);
        if (res.userRating) {
          setUserRating(Number(res.userRating.rating));
          setRatingComment(res.userRating.comment || "");
        }
        const ratingsRes = await getGymRatings(gymId, { page: 1, limit: 10 });
        setReviews(ratingsRes.data || []);
        try {
          const cardsRes = await getUserCards();
          setSavedCards(cardsRes.data || []);
        } catch { /* user might not be logged in */ }
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "Failed to load gym");
      } finally {
        setLoading(false);
      }
    })();
  }, [gymId, showError]);

  useEffect(() => {
    setBookStart("");
    setBookEnd("");
    setAvailabilityInfo(null);

    if (!showBooking || !bookCoachId || !bookDate) return;

    (async () => {
      setAvailabilityLoading(true);
      try {
        const res = await getCoachDateAvailability(bookCoachId, {
          gym_id: gymId,
          date: bookDate,
        });
        setAvailabilityInfo(res);
      } catch (e: unknown) {
        setAvailabilityInfo(null);
        showError(e instanceof Error ? e.message : "Failed to load coach availability");
      } finally {
        setAvailabilityLoading(false);
      }
    })();
  }, [showBooking, bookCoachId, bookDate, gymId, showError]);

  useEffect(() => {
    if (bookStart && !availableStartOptions.some((opt) => opt.time === bookStart)) {
      setBookStart("");
      setBookEnd("");
    }
  }, [bookStart, availableStartOptions]);

  useEffect(() => {
    if (bookEnd && !availableEndOptions.some((opt) => opt.time === bookEnd)) {
      setBookEnd("");
    }
  }, [bookEnd, availableEndOptions]);

  useEffect(() => {
    if (selectedWindowMode === "private_only") {
      setBookVisibility("private");
    } else if (selectedWindowMode === "public_only") {
      setBookVisibility("public");
    }
  }, [selectedWindowMode]);

  const handleSubscribe = async () => {
    if (!subscribePlanId) { showError("Please select a plan first."); return; }
    if (paymentMethod === "card" && !subSavedCardId && !/^\d{4}$/.test(cardNumber.trim().slice(-4))) {
      showError("For card payments, select a saved card or enter a valid card number.");
      return;
    }
    setSavingSub(true);
    try {
      const body: { plan_id: number; payment_method: PaymentMethod; card_last4?: string } =
        { plan_id: subscribePlanId, payment_method: paymentMethod };
      if (paymentMethod === "card") {
        if (subSavedCardId) {
          const sc = savedCards.find((c) => c.id === subSavedCardId);
          if (sc) body.card_last4 = sc.card_last4;
        } else if (cardNumber.trim().length >= 4) {
          body.card_last4 = cardNumber.trim().slice(-4);
        }
      }
      await createUserSubscription(body);
      showSuccess("Subscription created!");
      setSubscribePlanId(null); setSubSavedCardId(null);
      setCardNumber(""); setCardName(""); setCardExpiry(""); setCardCvv("");
      const res = await getGymDetails(gymId);
      setActiveSub(res.activeSubscription || null);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to subscribe");
    } finally { setSavingSub(false); }
  };

  const handleBook = async () => {
    if (!bookCoachId || !bookDate || !bookStart || !bookEnd) {
      showError("Please fill all booking fields."); return;
    }
    if (!availabilityInfo) {
      showError("Please select coach and date, then choose from available time slots.");
      return;
    }
    if (
      !availableStartOptions.some((opt) => opt.time === bookStart) ||
      !availableEndOptions.some((opt) => opt.time === bookEnd)
    ) {
      showError("Please select a valid available time range.");
      return;
    }
    if (bookPayMethod !== "cash" && bookPayMethod !== "card") {
      showError("Please select payment method (cash or card) before confirming.");
      return;
    }
    if (bookPayMethod === "card" && !bookSavedCardId && bookCardNumber.trim().length < 4) {
      showError("For card payments, select a saved card or enter a valid card number.");
      return;
    }
    if (selectedWindowMode === "both" && !bookVisibility) {
      showError("Please choose session visibility (private/public).");
      return;
    }
    setBookingSaving(true);
    try {
      let last4: string | undefined;
      if (bookPayMethod === "card") {
        if (bookSavedCardId) {
          const sc = savedCards.find((c) => c.id === bookSavedCardId);
          if (sc) last4 = sc.card_last4;
        } else if (bookCardNumber.trim().length >= 4) {
          last4 = bookCardNumber.trim().slice(-4);
        }
      }
      const res = await bookSession({
        gym_id: gymId,
        coach_id: bookCoachId,
        session_date: bookDate,
        start_time: bookStart,
        end_time: bookEnd,
        session_visibility: bookVisibility,
        payment_method: bookPayMethod as PaymentMethod,
        card_last4: last4,
      });
      if (res.payment_required) {
        showSuccess(`Session booked! $${res.amount_charged.toFixed(2)} charged.`);
      } else {
        showSuccess("Session booked successfully (covered by subscription).");
      }
      setShowBooking(false);
      setBookCoachId(null); setBookDate(""); setBookStart(""); setBookEnd("");
      setBookVisibility("private");
      setBookPayMethod(""); setBookSavedCardId(null);
      setBookCardName(""); setBookCardNumber(""); setBookCardExpiry(""); setBookCardCvv("");
      setAvailabilityInfo(null);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to book session");
    } finally { setBookingSaving(false); }
  };

  const handleRate = async () => {
    if (userRating < 0.5) { showError("Please select a rating."); return; }
    setRatingSaving(true);
    try {
      const res = await rateGym(gymId, { rating: userRating, comment: ratingComment || undefined });
      setRatingAvg(Number(res.rating_average));
      setRatingCount(Number(res.rating_count));
      showSuccess("Rating submitted!");
      const ratingsRes = await getGymRatings(gymId, { page: 1, limit: 10 });
      setReviews(ratingsRes.data || []);
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to rate");
    } finally { setRatingSaving(false); }
  };

  if (!gymId || Number.isNaN(gymId)) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-red-500">Invalid gym id.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {loading || !gym ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500">
            <Link href="/gyms" className="transition hover:text-stone-600 dark:hover:text-stone-300">Gyms</Link>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            <span className="text-stone-600 dark:text-stone-300">{gym.name}</span>
          </nav>

          {/* Image Gallery */}
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-stone-100 dark:border-stone-800 dark:bg-stone-800">
            {images.length > 0 ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveImg(images[currentImg].image_url)} alt={gym.name} className="h-72 w-full object-cover sm:h-80 lg:h-96" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                {images.length > 1 && (
                  <>
                    <button type="button" onClick={() => setCurrentImg((i) => (i - 1 + images.length) % images.length)} className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-stone-700 shadow-md backdrop-blur-sm transition hover:bg-white">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    </button>
                    <button type="button" onClick={() => setCurrentImg((i) => (i + 1) % images.length)} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 text-stone-700 shadow-md backdrop-blur-sm transition hover:bg-white">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </button>
                    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                      {images.map((_, i) => (
                        <button key={i} type="button" onClick={() => setCurrentImg(i)} className={`h-2 w-2 rounded-full transition ${i === currentImg ? "bg-white" : "bg-white/40"}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-stone-500">No images yet.</div>
            )}
          </div>

          {/* Gym header */}
          <div className="mt-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl dark:text-white">{gym.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">{gym.description || "No description."}</p>
            </div>
            <div className="flex items-center gap-2">
              <StarRating value={ratingAvg} readonly size="md" />
              <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">{ratingAvg.toFixed(1)}</span>
              <span className="text-xs text-stone-400">({ratingCount} reviews)</span>
            </div>
          </div>

          {/* Info pills */}
          <div className="mt-4 flex flex-wrap gap-3">
            {gym.location && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                {gym.location}
              </span>
            )}
            {gym.working_hours && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {gym.working_hours}
              </span>
            )}
            {gym.working_days && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                {gym.working_days}
              </span>
            )}
            {activeSub && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Subscribed until {activeSub.end_date}
              </span>
            )}
          </div>

          {/* Main Grid */}
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="space-y-10">
              {/* Plans */}
              <section>
                <h2 className="text-lg font-bold text-stone-900 dark:text-white">Subscription Plans</h2>
                {plans.length === 0 ? (
                  <p className="mt-3 text-sm text-stone-500">No active plans.</p>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {plans.map((plan) => {
                      const selected = subscribePlanId === plan.id;
                      return (
                        <button type="button" key={plan.id} onClick={() => setSubscribePlanId(plan.id)}
                          className={`group relative flex flex-col items-start rounded-2xl border-2 p-5 text-left transition-all ${selected ? "border-brand-500 bg-brand-50/50 shadow-lg shadow-brand-500/10 dark:bg-brand-950/20" : "border-stone-200/80 bg-white hover:border-stone-300 dark:border-stone-800 dark:bg-stone-900"}`}>
                          {selected && (
                            <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            </span>
                          )}
                          <span className="text-2xl font-bold text-stone-900 dark:text-white">${Number(plan.price).toFixed(2)}</span>
                          <span className="mt-1 text-xs text-stone-400">/ {plan.duration_days} days</span>
                          <span className="mt-3 text-sm font-semibold text-stone-800 dark:text-stone-200">{plan.name}</span>
                          {plan.description && <span className="mt-1 line-clamp-2 text-xs text-stone-500">{plan.description}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Coaches & Booking */}
              <section>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-stone-900 dark:text-white">Coaches</h2>
                  {isAuthenticated && coaches.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowBooking((prev) => {
                          const next = !prev;
                          if (next) {
                            setBookPayMethod(""); setBookSavedCardId(null);
                            setBookCardName(""); setBookCardNumber(""); setBookCardExpiry(""); setBookCardCvv("");
                          }
                          return next;
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                      Book a Session
                    </button>
                  )}
                </div>

                {coaches.length === 0 ? (
                  <p className="mt-3 text-sm text-stone-500">No coaches yet.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {coaches.map((coach) => (
                      <div key={coach.id} className="flex items-start gap-4 rounded-2xl border border-stone-200/80 bg-white p-5 transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                          {(coach.user_first_name || "C")[0].toUpperCase()}{(coach.user_last_name || "")[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-stone-900 dark:text-white">{coach.user_first_name} {coach.user_last_name}</p>
                              <p className="text-xs text-stone-500">{coach.specialization || "Coach"}</p>
                            </div>
                            {coach.price_per_session != null && (
                              <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                ${Number(coach.price_per_session).toFixed(2)}/session
                              </span>
                            )}
                          </div>
                          {coach.availability && coach.availability.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {coach.availability.slice(0, 5).map((a: any) => (
                                <span key={a.id} className="rounded-md bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                                  {a.day} {a.start_time && a.end_time ? `${a.start_time.slice(0, 5)}–${a.end_time.slice(0, 5)}` : ""}
                                </span>
                              ))}
                              {coach.availability.length > 5 && <span className="self-center text-[11px] text-stone-400">+{coach.availability.length - 5} more</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Booking Form */}
              {showBooking && (
                <section className="rounded-2xl border-2 border-brand-200 bg-brand-50/30 p-6 dark:border-brand-800 dark:bg-brand-950/20">
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">Book a Session</h3>
                  {!activeSub && (
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      You don&apos;t have an active subscription. A per-session fee will apply.
                    </p>
                  )}

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-400">Coach</label>
                      <select value={bookCoachId || ""} onChange={(e) => setBookCoachId(Number(e.target.value) || null)}
                        className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">
                        <option value="">Select a coach</option>
                        {coaches.map((c) => (
                          <option key={c.id} value={c.id}>{c.user_first_name} {c.user_last_name} — ${Number(c.price_per_session || 0).toFixed(2)}/session</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-400">Date</label>
                      <input
                        type="date"
                        value={bookDate}
                        min={todayIso}
                        onChange={(e) => setBookDate(e.target.value)}
                        className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-400">Start Time</label>
                      <select
                        value={bookStart}
                        onChange={(e) => {
                          setBookStart(e.target.value);
                          setBookEnd("");
                        }}
                        disabled={!availabilityInfo || availabilityLoading || availableStartOptions.length === 0}
                        className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                      >
                        <option value="">
                          {availabilityLoading
                            ? "Loading..."
                            : !bookCoachId || !bookDate
                            ? "Select coach and date first"
                            : availableStartOptions.length
                            ? "Select start time"
                            : "No available times"}
                        </option>
                        {availableStartOptions.map((opt) => (
                          <option key={`${opt.time}-${opt.slot_mode}`} value={opt.time}>
                            {opt.time}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-stone-600 dark:text-stone-400">End Time</label>
                      <select
                        value={bookEnd}
                        onChange={(e) => setBookEnd(e.target.value)}
                        disabled={!bookStart || availabilityLoading || availableEndOptions.length === 0}
                        className="h-10 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                      >
                        <option value="">
                          {!bookStart
                            ? "Select start time first"
                            : availableEndOptions.length
                            ? "Select end time"
                            : "No valid end times"}
                        </option>
                        {availableEndOptions.map((opt) => (
                          <option key={`${opt.time}-${opt.slot_mode}`} value={opt.time}>
                            {opt.time}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {selectedWindowMode && (
                    <div className="mt-4 rounded-xl border border-stone-200 bg-white/70 p-3 dark:border-stone-700 dark:bg-stone-900/70">
                      <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                        Session visibility
                      </p>
                      {selectedWindowMode === "both" ? (
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setBookVisibility("private")}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              bookVisibility === "private"
                                ? "bg-brand-500 text-white"
                                : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200"
                            }`}
                          >
                            Private
                          </button>
                          <button
                            type="button"
                            onClick={() => setBookVisibility("public")}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                              bookVisibility === "public"
                                ? "bg-emerald-500 text-white"
                                : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200"
                            }`}
                          >
                            Public
                          </button>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                          This selected time is{" "}
                          <span className="font-semibold text-stone-700 dark:text-stone-200">
                            {selectedWindowMode === "private_only" ? "Private only" : "Public only"}
                          </span>
                          .
                        </p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-stone-200 bg-white/70 p-3 dark:border-stone-700 dark:bg-stone-900/70">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                        Pick date from coach availability
                      </p>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarMonth(
                              (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                            )
                          }
                          className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                        >
                          Prev
                        </button>
                        <span className="min-w-[110px] text-center text-xs font-medium text-stone-700 dark:text-stone-200">
                          {calendarMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setCalendarMonth(
                              (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                            )
                          }
                          className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {WEEK_DAY_LABELS.map((label) => (
                        <div
                          key={label}
                          className="py-1 text-center text-[11px] font-semibold text-stone-500 dark:text-stone-400"
                        >
                          {label}
                        </div>
                      ))}
                      {calendarCells.map((cell, idx) => {
                        if (!cell.date) {
                          return <div key={`empty-${idx}`} className="h-8" />;
                        }

                        const iso = formatDateIso(cell.date);
                        const dayName = WEEK_DAYS[cell.date.getDay()];
                        const isPast = cell.date < todayStart;
                        const isAvailableDay = coachAvailableDays.has(dayName);
                        const isSelectable = !!bookCoachId && isAvailableDay && !isPast;
                        const isSelected = bookDate === iso;

                        return (
                          <button
                            key={iso}
                            type="button"
                            disabled={!isSelectable}
                            onClick={() => {
                              setBookDate(iso);
                              setBookStart("");
                              setBookEnd("");
                            }}
                            className={`h-8 rounded-md text-xs transition ${
                              isSelected
                                ? "bg-brand-500 text-white"
                                : isSelectable
                                ? "bg-orange-500/15 text-orange-600 hover:bg-orange-500/25 dark:text-orange-300"
                                : "text-stone-400 dark:text-stone-600"
                            } ${!isSelectable ? "cursor-not-allowed" : ""}`}
                          >
                            {cell.date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-stone-500 dark:text-stone-400">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-orange-500/40" />
                        Coach available day
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded bg-brand-500" />
                        Selected date
                      </span>
                    </div>
                  </div>

                  {availabilityInfo && (
                    <div className="mt-4 rounded-xl border border-stone-200 bg-white/70 p-3 dark:border-stone-700 dark:bg-stone-900/70">
                      <p className="text-xs font-semibold text-stone-700 dark:text-stone-200">
                        Availability on {availabilityInfo.day}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {availabilityInfo.available_windows.length > 0 ? (
                          availabilityInfo.available_windows.map((w, idx) => (
                            <span
                              key={`${w.start_time}-${w.end_time}-${w.slot_mode}-${idx}`}
                              className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                            >
                              {w.start_time} - {w.end_time}{" "}
                              <span className="opacity-80">
                                ({w.slot_mode === "both"
                                  ? "both"
                                  : w.slot_mode === "private_only"
                                  ? "private"
                                  : "public"})
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-red-500">
                            No free time windows for this date.
                          </span>
                        )}
                      </div>
                      {availabilityInfo.suggested_slots.length > 0 && (
                        <p className="mt-2 text-[11px] text-stone-500 dark:text-stone-400">
                          Suggested 60-minute slots are auto-calculated from coach availability.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Price breakdown */}
                  {selectedCoach && selectedCoachPrice > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-800">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Session price</p>
                        <p className="mt-1 text-lg font-bold text-stone-900 dark:text-white">${selectedCoachPrice.toFixed(2)}</p>
                        {selectedCoachGymShare > 0 && (
                          <div className="mt-2 flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                            <span>Gym share ({selectedCoachGymShare}%): <span className="font-semibold text-brand-600 dark:text-brand-400">${gymShareAmount.toFixed(2)}</span></span>
                            <span className="text-stone-300 dark:text-stone-600">|</span>
                            <span>Coach net: <span className="font-semibold text-emerald-600 dark:text-emerald-400">${coachNetAmount.toFixed(2)}</span></span>
                          </div>
                        )}
                        {activeSub && (
                          <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">Covered by your subscription — no extra charge.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Payment method */}
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-medium text-stone-600 dark:text-stone-400">Payment method <span className="text-red-500">*</span></p>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => { setBookPayMethod("cash"); setBookSavedCardId(null); }}
                          className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-medium transition ${bookPayMethod === "cash" ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400" : "border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"}`}>
                          Cash
                        </button>
                        <button type="button" onClick={() => setBookPayMethod("card")}
                          className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-medium transition ${bookPayMethod === "card" ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400" : "border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"}`}>
                          Card
                        </button>
                      </div>
                      {bookPayMethod === "" && (
                        <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                          Select a payment method before confirming booking.
                        </p>
                      )}
                    </div>

                    {bookPayMethod === "card" && (
                      <div className="space-y-3">
                        {savedCards.length > 0 && (
                          <div>
                            <p className="mb-2 text-[11px] font-medium text-stone-500">Saved cards</p>
                            <div className="space-y-2">
                              {savedCards.map((sc) => (
                                <button
                                  key={sc.id}
                                  type="button"
                                  onClick={() => {
                                    setBookSavedCardId(sc.id);
                                    setBookCardName(""); setBookCardNumber(""); setBookCardExpiry(""); setBookCardCvv("");
                                  }}
                                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition ${bookSavedCardId === sc.id ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"}`}
                                >
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-xs font-bold text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                                    {sc.card_brand.charAt(0).toUpperCase()}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-semibold text-stone-800 dark:text-stone-200">
                                      {sc.card_brand.toUpperCase()} •••• {sc.card_last4}
                                    </p>
                                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                                      {sc.card_holder} &middot; {sc.card_expiry}
                                      {sc.is_default && <span className="ml-1 text-brand-500">(default)</span>}
                                    </p>
                                  </div>
                                  {bookSavedCardId === sc.id && (
                                    <svg className="h-5 w-5 shrink-0 text-brand-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                  )}
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={() => { setBookSavedCardId(null); }}
                              className={`mt-2 text-[11px] font-medium transition ${!bookSavedCardId ? "text-brand-500" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"}`}
                            >
                              {bookSavedCardId ? "Use a new card instead" : "Entering new card details below"}
                            </button>
                          </div>
                        )}

                        {!bookSavedCardId && (
                          <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-stone-500">Card holder</label>
                              <input type="text" value={bookCardName} onChange={(e) => setBookCardName(e.target.value)}
                                className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="Name on card" />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-medium text-stone-500">Card number</label>
                              <input type="text" value={bookCardNumber} onChange={(e) => setBookCardNumber(e.target.value)}
                                className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="1234 5678 9012 3456" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-stone-500">Expiry</label>
                                <input type="text" value={bookCardExpiry} onChange={(e) => setBookCardExpiry(e.target.value)}
                                  className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="MM/YY" />
                              </div>
                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-stone-500">CVV</label>
                                <input type="password" value={bookCardCvv} onChange={(e) => setBookCardCvv(e.target.value)}
                                  className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="123" />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <button type="button" disabled={bookingSaving || bookingPaymentInvalid} onClick={handleBook}
                    className="mt-5 flex w-full items-center justify-center rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-50">
                    {bookingSaving ? "Booking..." : "Confirm Booking"}
                  </button>
                  <p className="mt-2 text-center text-[11px] text-stone-400">Card payments are simulated.</p>
                </section>
              )}

              {/* Ratings & Reviews */}
              <section>
                <h2 className="text-lg font-bold text-stone-900 dark:text-white">Ratings & Reviews</h2>

                {isAuthenticated && (
                  <div className="mt-4 rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                    <p className="text-sm font-medium text-stone-700 dark:text-stone-300">Your rating</p>
                    <div className="mt-2 flex items-center gap-3">
                      <StarRating value={userRating} onChange={setUserRating} size="lg" />
                      <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                        {userRating > 0 ? userRating.toFixed(1) : "—"}
                      </span>
                    </div>
                    <textarea rows={2} placeholder="Leave a comment (optional)" value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      className="mt-3 w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3.5 py-2 text-sm text-stone-800 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
                    <button type="button" disabled={ratingSaving} onClick={handleRate}
                      className="mt-3 inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-50">
                      {ratingSaving ? "Submitting..." : "Submit Rating"}
                    </button>
                  </div>
                )}

                {reviews.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {reviews.map((r) => (
                      <div key={r.id} className="rounded-xl border border-stone-100 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-800/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-xs font-bold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                              {(r.first_name || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{r.first_name} {r.last_name}</p>
                              <p className="text-[11px] text-stone-400">{new Date(r.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <StarRating value={Number(r.rating)} readonly size="sm" />
                        </div>
                        {r.comment && <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">{r.comment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Sidebar — Subscribe */}
            <aside className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-stone-800 dark:bg-stone-900">
                <h3 className="text-lg font-bold text-stone-900 dark:text-white">Subscribe</h3>
                {activeSub ? (
                  <div className="mt-3 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-950/30">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">You are subscribed!</p>
                    <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Valid until {activeSub.end_date}. You can book sessions at no extra cost.</p>
                  </div>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-stone-500">Select a plan on the left, then choose your payment method.</p>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-800">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400">Selected plan</p>
                        <p className="mt-1 text-sm font-semibold text-stone-900 dark:text-white">
                          {subscribePlanId ? plans.find((p) => p.id === subscribePlanId)?.name ?? "Plan" : "No plan selected"}
                        </p>
                        {subscribePlanId && (
                          <p className="mt-0.5 text-xs text-brand-500">${Number(plans.find((p) => p.id === subscribePlanId)?.price || 0).toFixed(2)}</p>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-medium text-stone-600 dark:text-stone-400">Payment method</p>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => { setPaymentMethod("cash"); setSubSavedCardId(null); }}
                            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-medium transition ${paymentMethod === "cash" ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400" : "border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"}`}>
                            Cash
                          </button>
                          <button type="button" onClick={() => setPaymentMethod("card")}
                            className={`flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-xs font-medium transition ${paymentMethod === "card" ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400" : "border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300"}`}>
                            Card
                          </button>
                        </div>
                      </div>

                      {paymentMethod === "card" && (
                        <div className="space-y-3">
                          {savedCards.length > 0 && (
                            <div>
                              <p className="mb-2 text-[11px] font-medium text-stone-500">Saved cards</p>
                              <div className="space-y-2">
                                {savedCards.map((sc) => (
                                  <button
                                    key={sc.id}
                                    type="button"
                                    onClick={() => {
                                      setSubSavedCardId(sc.id);
                                      setCardName(""); setCardNumber(""); setCardExpiry(""); setCardCvv("");
                                    }}
                                    className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition ${subSavedCardId === sc.id ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30" : "border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800"}`}
                                  >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-xs font-bold text-stone-600 dark:bg-stone-700 dark:text-stone-300">
                                      {sc.card_brand.charAt(0).toUpperCase()}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-xs font-semibold text-stone-800 dark:text-stone-200">
                                        {sc.card_brand.toUpperCase()} •••• {sc.card_last4}
                                      </p>
                                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                                        {sc.card_holder} &middot; {sc.card_expiry}
                                        {sc.is_default && <span className="ml-1 text-brand-500">(default)</span>}
                                      </p>
                                    </div>
                                    {subSavedCardId === sc.id && (
                                      <svg className="h-5 w-5 shrink-0 text-brand-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                    )}
                                  </button>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => { setSubSavedCardId(null); }}
                                className={`mt-2 text-[11px] font-medium transition ${!subSavedCardId ? "text-brand-500" : "text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"}`}
                              >
                                {subSavedCardId ? "Use a new card instead" : "Entering new card details below"}
                              </button>
                            </div>
                          )}

                          {!subSavedCardId && (
                            <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-stone-700 dark:bg-stone-800/50">
                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-stone-500">Card holder</label>
                                <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="Name on card" />
                              </div>
                              <div>
                                <label className="mb-1 block text-[11px] font-medium text-stone-500">Card number</label>
                                <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="1234 5678 9012 3456" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="mb-1 block text-[11px] font-medium text-stone-500">Expiry</label>
                                  <input type="text" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="MM/YY" />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[11px] font-medium text-stone-500">CVV</label>
                                  <input type="password" value={cardCvv} onChange={(e) => setCardCvv(e.target.value)} className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="123" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button type="button" disabled={savingSub} onClick={handleSubscribe}
                      className="mt-5 flex w-full items-center justify-center rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-50">
                      {savingSub ? "Processing..." : "Confirm Subscription"}
                    </button>
                    <p className="mt-2 text-center text-[11px] text-stone-400">Card payments are simulated.</p>
                  </>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
