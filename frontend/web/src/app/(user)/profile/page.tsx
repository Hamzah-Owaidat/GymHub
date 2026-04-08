"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getUserSubscriptions, type UserSubscription } from "@/lib/api/userSubscriptions";
import {
  getUserCards,
  createUserCard,
  setDefaultCard,
  deleteUserCard,
  type SavedCard,
} from "@/lib/api/userCards";
import { useToast } from "@/context/ToastContext";

const BRAND_ICONS: Record<string, string> = {
  visa: "V",
  mastercard: "M",
  amex: "A",
  discover: "D",
};

const BRAND_COLORS: Record<string, string> = {
  visa: "from-blue-600 to-blue-800",
  mastercard: "from-red-500 to-orange-500",
  amex: "from-indigo-500 to-indigo-700",
  discover: "from-amber-500 to-orange-600",
};

export default function ProfilePage() {
  const { user } = useAuthStore();
  const { error: showError, success: showSuccess } = useToast();
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  const [cards, setCards] = useState<SavedCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [maxCards, setMaxCards] = useState(2);
  const [showAddCard, setShowAddCard] = useState(false);
  const [addCardSaving, setAddCardSaving] = useState(false);
  const [newCardLabel, setNewCardLabel] = useState("");
  const [newCardHolder, setNewCardHolder] = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getUserSubscriptions();
        setSubscriptions(res.data || []);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadCards = async () => {
    try {
      const res = await getUserCards();
      setCards(res.data || []);
      setMaxCards(res.max || 2);
    } catch {
      /* silent */
    } finally {
      setCardsLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, []);

  const resetCardForm = () => {
    setNewCardLabel("");
    setNewCardHolder("");
    setNewCardNumber("");
    setNewCardExpiry("");
    setNewCardCvv("");
  };

  const handleAddCard = async () => {
    if (!newCardHolder.trim()) { showError("Card holder name is required."); return; }
    if (newCardNumber.replace(/\s/g, "").length < 4) { showError("Enter a valid card number."); return; }
    if (!/^\d{2}\/\d{2}$/.test(newCardExpiry.trim())) { showError("Expiry must be MM/YY."); return; }
    setAddCardSaving(true);
    try {
      await createUserCard({
        card_label: newCardLabel.trim() || undefined,
        card_holder: newCardHolder.trim(),
        card_number: newCardNumber.replace(/\s/g, ""),
        card_expiry: newCardExpiry.trim(),
        is_default: cards.length === 0,
      });
      showSuccess("Card saved successfully!");
      resetCardForm();
      setShowAddCard(false);
      await loadCards();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to save card");
    } finally {
      setAddCardSaving(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultCard(id);
      await loadCards();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to set default card");
    }
  };

  const handleDeleteCard = async (id: number) => {
    try {
      await deleteUserCard(id);
      showSuccess("Card removed.");
      await loadCards();
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to remove card");
    }
  };

  const initials =
    ((user?.first_name || "")[0] || "") + ((user?.last_name || "")[0] || "");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Profile card */}
        <div className="flex flex-col items-center rounded-2xl border border-stone-200/80 bg-white p-8 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-stone-800 dark:bg-stone-900">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-orange-500 text-2xl font-bold text-white shadow-lg shadow-brand-500/25">
            {initials.toUpperCase() || "?"}
          </div>
          <h2 className="mt-4 text-lg font-bold text-stone-900 dark:text-white">
            {user?.first_name} {user?.last_name}
          </h2>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
            {user?.email}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
            {user?.role || "member"}
          </span>

          <div className="mt-6 w-full space-y-3 border-t border-stone-200/80 pt-6 dark:border-stone-800">
            <div className="flex justify-between text-xs">
              <span className="text-stone-400 dark:text-stone-500">Subscriptions</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">{subscriptions.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-stone-400 dark:text-stone-500">Saved cards</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">{cards.length} / {maxCards}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-stone-400 dark:text-stone-500">Status</span>
              <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-8">
          {/* Account info */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-stone-800 dark:bg-stone-900">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">Account Details</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                { label: "First name", value: user?.first_name || "—" },
                { label: "Last name", value: user?.last_name || "—" },
                { label: "Email", value: user?.email || "—" },
                { label: "Role", value: user?.role || "member" },
              ].map((field) => (
                <div key={field.label} className="rounded-xl bg-stone-50 p-4 dark:bg-stone-800">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500">{field.label}</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900 dark:text-white">{field.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Saved Cards */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">Saved Cards</h3>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                {cards.length} / {maxCards}
              </span>
            </div>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Save up to {maxCards} cards for faster payments across all gyms.
            </p>

            {cardsLoading ? (
              <div className="mt-6 flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : (
              <>
                {cards.length === 0 ? (
                  <div className="mt-6 flex flex-col items-center py-8 text-center">
                    <svg className="mb-2 h-10 w-10 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                    <p className="text-sm text-stone-500 dark:text-stone-400">No saved cards.</p>
                    <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">Add a card to speed up payments.</p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {cards.map((card) => (
                      <div
                        key={card.id}
                        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${BRAND_COLORS[card.card_brand] || "from-stone-600 to-stone-800"} p-5 text-white shadow-lg`}
                      >
                        {card.is_default && (
                          <span className="absolute right-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm">
                            Default
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold backdrop-blur-sm">
                            {BRAND_ICONS[card.card_brand] || "?"}
                          </span>
                          <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                            {card.card_brand}
                          </span>
                        </div>
                        <p className="mt-4 font-mono text-lg tracking-widest">
                          •••• •••• •••• {card.card_last4}
                        </p>
                        <div className="mt-3 flex items-end justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider opacity-60">Card holder</p>
                            <p className="text-xs font-semibold">{card.card_holder}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider opacity-60">Expires</p>
                            <p className="text-xs font-semibold">{card.card_expiry}</p>
                          </div>
                        </div>
                        {card.card_label && card.card_label !== "My Card" && (
                          <p className="mt-2 text-[10px] italic opacity-70">{card.card_label}</p>
                        )}
                        <div className="mt-3 flex gap-2 border-t border-white/20 pt-3">
                          {!card.is_default && (
                            <button type="button" onClick={() => handleSetDefault(card.id)}
                              className="rounded-lg bg-white/20 px-3 py-1 text-[11px] font-medium backdrop-blur-sm transition hover:bg-white/30">
                              Set default
                            </button>
                          )}
                          <button type="button" onClick={() => handleDeleteCard(card.id)}
                            className="rounded-lg bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur-sm transition hover:bg-red-500/40">
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {cards.length < maxCards && !showAddCard && (
                  <button
                    type="button"
                    onClick={() => { resetCardForm(); setShowAddCard(true); }}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-stone-300 px-5 py-3 text-sm font-medium text-stone-500 transition hover:border-brand-400 hover:text-brand-500 dark:border-stone-700 dark:text-stone-400 dark:hover:border-brand-600 dark:hover:text-brand-400"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Add a new card
                  </button>
                )}

                {showAddCard && (
                  <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50/50 p-5 dark:border-stone-700 dark:bg-stone-800/50">
                    <h4 className="text-sm font-bold text-stone-900 dark:text-white">Add New Card</h4>
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-stone-500">Card label (optional)</label>
                        <input type="text" value={newCardLabel} onChange={(e) => setNewCardLabel(e.target.value)}
                          className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="e.g. Personal, Work" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-stone-500">Card holder <span className="text-red-500">*</span></label>
                        <input type="text" value={newCardHolder} onChange={(e) => setNewCardHolder(e.target.value)}
                          className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="Name on card" />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-stone-500">Card number <span className="text-red-500">*</span></label>
                        <input type="text" value={newCardNumber} onChange={(e) => setNewCardNumber(e.target.value)}
                          className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="1234 5678 9012 3456" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-stone-500">Expiry <span className="text-red-500">*</span></label>
                          <input type="text" value={newCardExpiry} onChange={(e) => setNewCardExpiry(e.target.value)}
                            className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="MM/YY" />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-stone-500">CVV</label>
                          <input type="password" value={newCardCvv} onChange={(e) => setNewCardCvv(e.target.value)}
                            className="h-9 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100" placeholder="123" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <button type="button" disabled={addCardSaving} onClick={handleAddCard}
                        className="inline-flex items-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-600 disabled:opacity-50">
                        {addCardSaving ? "Saving..." : "Save Card"}
                      </button>
                      <button type="button" onClick={() => { setShowAddCard(false); resetCardForm(); }}
                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-500 transition hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
                        Cancel
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] text-stone-400">Card payments are simulated. Only the last 4 digits are stored.</p>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Subscriptions */}
          <section className="rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900 dark:text-white">My Subscriptions</h3>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                {subscriptions.length} total
              </span>
            </div>

            {loading ? (
              <div className="mt-6 flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="mt-6 flex flex-col items-center py-8 text-center">
                <svg className="mb-2 h-10 w-10 text-stone-300 dark:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                <p className="text-sm text-stone-500 dark:text-stone-400">No subscriptions yet.</p>
                <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">Browse gyms to subscribe to a plan.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {subscriptions.map((sub) => {
                  const isActive = sub.status === "active";
                  return (
                    <div key={sub.id} className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/50 p-4 dark:border-stone-800 dark:bg-stone-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-bold text-brand-500 dark:bg-brand-950/40">
                          {(sub.gym_name || "G").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-900 dark:text-white">{sub.plan_name}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{sub.gym_name} &middot; {sub.duration_days} days</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-stone-900 dark:text-white">${Number(sub.plan_price).toFixed(2)}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isActive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"}`}>
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
