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

type AvailabilitySlot = {
  day: string;
  start_time: string;
  end_time: string;
  slot_mode: "private_only" | "public_only" | "both";
};

function validateSlots(slots: AvailabilitySlot[]): string | null {
  const seen = new Set<string>();

  for (const slot of slots) {
    if (!slot.day || !slot.start_time || !slot.end_time) {
      return "Each availability slot must include day, start time, and end time.";
    }

    if (slot.start_time >= slot.end_time) {
      return `Start time must be before end time for ${slot.day}.`;
    }

    const key = `${slot.day}|${slot.start_time}|${slot.end_time}`;
    if (seen.has(key)) {
      return `Duplicate slot detected: ${slot.day} ${slot.start_time}-${slot.end_time}.`;
    }
    seen.add(key);
  }

  const grouped = new Map<string, AvailabilitySlot[]>();
  for (const slot of slots) {
    if (!grouped.has(slot.day)) grouped.set(slot.day, []);
    grouped.get(slot.day)!.push(slot);
  }

  for (const [day, daySlots] of grouped.entries()) {
    const sorted = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time));
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].start_time < sorted[i - 1].end_time) {
        return `Availability slots overlap on ${day}.`;
      }
    }
  }

  return null;
}

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
            slot_mode: a.slot_mode || (a.is_private ? "private_only" : "public_only"),
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
    setSlots((prev) => [...prev, { day: "monday", start_time: "08:00", end_time: "17:00", slot_mode: "private_only" }]);
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
    const validationError = validateSlots(slots);
    if (validationError) {
      showError(validationError);
      return;
    }

    setSaving(true);
    try {
      await updateMyAvailability(
        slots.map((s) => ({
          day: s.day,
          start_time: s.start_time || null,
          end_time: s.end_time || null,
          slot_mode: s.slot_mode,
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
                  Define your weekly slots and whether each slot allows private, public, or both session types.
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
                  <select
                    value={slot.slot_mode}
                    onChange={(e) => updateSlot(idx, "slot_mode", e.target.value)}
                    className="h-9 min-w-[120px] rounded-lg border border-stone-200 bg-white px-2 text-xs text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                  >
                    <option value="private_only">Private only</option>
                    <option value="public_only">Public only</option>
                    <option value="both">Both</option>
                  </select>
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

