"use client";

import { useState } from "react";

type Props = {
  value: number;
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
};

const SIZE_MAP = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7" };

export default function StarRating({
  value,
  onChange,
  size = "md",
  readonly = false,
}: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;
  const cls = SIZE_MAP[size];

  const handleClick = (star: number, isHalf: boolean) => {
    if (readonly || !onChange) return;
    onChange(isHalf ? star - 0.5 : star);
  };

  return (
    <div
      className="inline-flex items-center gap-0.5"
      onMouseLeave={() => !readonly && setHover(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = display >= star;
        const half = !filled && display >= star - 0.5;

        return (
          <span key={star} className={`relative ${readonly ? "" : "cursor-pointer"} ${cls}`}>
            {/* Left half hitbox */}
            {!readonly && (
              <span
                className="absolute inset-y-0 left-0 z-10 w-1/2"
                onMouseEnter={() => setHover(star - 0.5)}
                onClick={() => handleClick(star, true)}
              />
            )}
            {/* Right half hitbox */}
            {!readonly && (
              <span
                className="absolute inset-y-0 right-0 z-10 w-1/2"
                onMouseEnter={() => setHover(star)}
                onClick={() => handleClick(star, false)}
              />
            )}

            <svg
              viewBox="0 0 24 24"
              className={`${cls} ${
                filled
                  ? "text-amber-400"
                  : half
                  ? "text-amber-400"
                  : "text-stone-300 dark:text-stone-600"
              }`}
            >
              <defs>
                <linearGradient id={`half-${star}`}>
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
              {filled ? (
                <path
                  fill="currentColor"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              ) : half ? (
                <>
                  <path
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                  />
                  <clipPath id={`clip-${star}`}>
                    <rect x="0" y="0" width="12" height="24" />
                  </clipPath>
                  <path
                    fill="currentColor"
                    clipPath={`url(#clip-${star})`}
                    d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                  />
                </>
              ) : (
                <path
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              )}
            </svg>
          </span>
        );
      })}
    </div>
  );
}
