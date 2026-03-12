"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/context/ToastContext";
import { getMyCoachProfile, updateMyAvailability, type CoachAvailability } from "@/lib/api/coaches";
import { TrashBinIcon } from "@/icons";
import React, { useEffect, useState } from "react";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, "0");
  return `${h}:00`;
});

type AvailabilitySlot = { day: string; start_time: string; end_time: string; is_private: boolean };

export default function CoachAvailabilityPage() {
  const { error: showError, success: showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getMyCoachProfile();
        const avail = (res.coach.availability || []) as CoachAvailability[];
        setSlots(
          avail.map((a) => ({
            day: a.day,
            start_time: a.start_time ? a.start_time.slice(0, 5) : "08:00",
            end_time: a.end_time ? a.end_time.slice(0, 5) : "17:00",
            is_private: a.is_private !== undefined ? !!a.is_private : true,
          })),
        );
      } catch (e: unknown) {
        showError(e instanceof Error ? e.message : "Failed to load availability");
      } finally {
        setLoading(false);
      }
    })();
  }, [showError]);

  const addSlot = () => {
    setSlots((prev) => [...prev, { day: "monday", start_time: "08:00", end_time: "17:00", is_private: true }]);
  };

  const removeSlot = (idx: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSlot = (idx: number, field: keyof AvailabilitySlot, value: string | boolean) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateMyAvailability(
        slots.map((s) => ({
          day: s.day,
          start_time: s.start_time || null,
          end_time: s.end_time || null,
          is_private: s.is_private,
        })),
      );
      showSuccess("Availability updated");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to save availability");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBreadcrumb pageTitle="My Availability" />
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-700 dark:bg-stone-800 md:p-8">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-stone-500 dark:text-stone-400">
            Loading...
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Weekly availability</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Define when you are available for sessions. Private slots cannot overlap with other private sessions.
                </p>
              </div>
              <button
                type="button"
                onClick={addSlot}
                className="text-xs font-medium text-brand-500 hover:text-brand-600"
              >
                + Add slot
              </button>
            </div>

            {slots.length === 0 && (
              <p className="text-sm text-stone-500 dark:text-stone-400">No availability slots defined.</p>
            )}

            <div className="space-y-2">
              {slots.map((slot, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <select
                    value={slot.day}
                    onChange={(e) => updateSlot(idx, "day", e.target.value)}
                    className="h-9 min-w-[110px] rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={slot.start_time}
                    onChange={(e) => updateSlot(idx, "start_time", e.target.value)}
                    className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-stone-400">to</span>
                  <select
                    value={slot.end_time}
                    onChange={(e) => updateSlot(idx, "end_time", e.target.value)}
                    className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    {HOURS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-300">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-stone-300 text-brand-500 focus:ring-brand-500/40"
                      checked={slot.is_private}
                      onChange={(e) => updateSlot(idx, "is_private", e.target.checked)}
                    />
                    Private slot
                  </label>
                  <button
                    type="button"
                    onClick={() => removeSlot(idx)}
                    className="ml-1 text-red-400 hover:text-red-600"
                  >
                    <TrashBinIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Availability"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

