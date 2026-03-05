import React, { FC } from "react";

interface InputProps {
  type?: "text" | "number" | "email" | "password" | "date" | "time" | string;
  id?: string;
  name?: string;
  placeholder?: string;
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  min?: string;
  max?: string;
  step?: number;
  disabled?: boolean;
  success?: boolean;
  error?: boolean;
  hint?: string; // Optional hint text
}

const Input: FC<InputProps> = ({
  type = "text",
  id,
  name,
  placeholder,
  value,
  defaultValue,
  onChange,
  className = "",
  min,
  max,
  step,
  disabled = false,
  success = false,
  error = false,
  hint,
}) => {
  // Base styles + state styles (success/error) with left color band
  const stateClasses =
    error
      ? "border-l-4 border-l-red-600 dark:border-l-red-600"
      : success
      ? "border-l-4 border-l-emerald-600 dark:border-l-emerald-400"
      : "border-l-4 border-l-gray-300";

  const inputClasses = [
    "h-11 w-full rounded-lg border border-gray-300 outline-none appearance-none px-4 py-2.5 text-sm placeholder:text-gray-400",
    "dark:bg-stone-950 dark:text-white/90 dark:placeholder:text-white/30 dark:border-gray-700",
    stateClasses,
    className,
  ].join(" ");

  return (
    <div className="relative">
      <input
        type={type}
        id={id}
        name={name}
        value={value}
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={inputClasses}
      />

      {/* Optional Hint Text */}
      {hint && (
        <p
          className={`mt-1.5 text-xs ${
            error
              ? "text-error-500"
              : success
              ? "text-success-500"
              : "text-gray-500"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;
