"use client";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { EyeCloseIcon, EyeIcon } from "@/icons";
import { registerUser } from "@/lib/auth";
import { useToast } from "@/context/ToastContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React, { useState } from "react";
import { PHONE_COUNTRY_CODES } from "@/constants/phoneCodes";

export default function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+966");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneCountryCodeError, setPhoneCountryCodeError] = useState<string | null>(null);
  const router = useRouter();
  const { error: showErrorToast, success: showSuccessToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFirstNameError(null);
    setLastNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setPhoneError(null);
    setPhoneCountryCodeError(null);

    let hasError = false;
    if (!firstName) {
      setFirstNameError("First name is required.");
      hasError = true;
    }
    if (!lastName) {
      setLastNameError("Last name is required.");
      hasError = true;
    }
    if (!email) {
      setEmailError("Email is required.");
      hasError = true;
    }
    if (!phone) {
      setPhoneError("Phone is required.");
      hasError = true;
    }
    if (!phoneCountryCode) {
      setPhoneCountryCodeError("Country code is required.");
      hasError = true;
    }
    if (!password || password.length < 6) {
      setPasswordError(
        !password ? "Password is required." : "Password must be at least 6 characters."
      );
      hasError = true;
    }

    if (!isChecked) {
      const msg = "You must accept the terms and privacy policy.";
      setError(msg);
      showErrorToast(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        dob: dob || undefined,
        phone,
        phone_country_code: phoneCountryCode,
      });
      const msg =
        res.message || "Account created successfully. You can now sign in.";
      setSuccess(msg);
      showSuccessToast(msg);
      setTimeout(() => router.push("/auth/signin"), 1200);
    } catch (err: any) {
      const msg = err.message || "Failed to sign up";
      setError(msg);
      showErrorToast(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar bg-white dark:bg-stone-950 py-5">

      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-neutral-900 text-title-sm dark:text-yellow-300 sm:text-title-md">
              Sign Up
            </h1>
            <p className="text-sm text-neutral-800 dark:text-gray-200">
              Enter your email and password to sign up!
            </p>
          </div>
            <div>
            <form onSubmit={handleSubmit}>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* <!-- First Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      First Name<span className="text-orange-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="fname"
                      name="fname"
                      placeholder="Enter your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      error={!!firstNameError}
                      hint={firstNameError || undefined}
                    />
                  </div>
                  {/* <!-- Last Name --> */}
                  <div className="sm:col-span-1">
                    <Label>
                      Last Name<span className="text-orange-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      id="lname"
                      name="lname"
                      placeholder="Enter your last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      error={!!lastNameError}
                      hint={lastNameError || undefined}
                    />
                  </div>
                </div>
                {/* <!-- Email --> */}
                <div>
                  <Label>
                    Email<span className="text-orange-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!emailError}
                    hint={emailError || undefined}
                  />
                </div>

                {/* <!-- Phone & DOB --> */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-[2fr_1fr]">
                  <div className="flex flex-col gap-1">
                    <Label>
                      Phone number<span className="text-orange-500">*</span>
                    </Label>
                    <div
                      className={`flex h-11 w-full items-center rounded-lg border bg-white text-sm dark:bg-stone-950 dark:text-white/90 dark:border-gray-700 ${
                        phoneError || phoneCountryCodeError
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    >
                      <div className="flex items-center border-r border-gray-200 px-2 dark:border-stone-700">
                        <select
                          id="phone_country_code"
                          name="phone_country_code"
                          value={phoneCountryCode}
                          onChange={(e) => setPhoneCountryCode(e.target.value)}
                          className="cursor-pointer bg-white pr-1 text-xs font-medium text-stone-900 outline-none dark:bg-stone-950 dark:text-stone-100"
                        >
                          {PHONE_COUNTRY_CODES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.short} {c.code}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 000-000"
                        className="h-full w-full rounded-r-lg bg-transparent px-3 text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-white/30"
                      />
                    </div>
                    {(phoneError || phoneCountryCodeError) && (
                      <p className="mt-1.5 text-xs text-error-500">
                        {phoneError || phoneCountryCodeError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label>Date of birth (optional)</Label>
                    <Input
                      type="date"
                      id="dob"
                      name="dob"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                </div>
                {/* <!-- Password --> */}
                <div>
                  <Label>
                    Password<span className="text-orange-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Enter your password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={!!passwordError}
                      hint={passwordError || undefined}
                    />
                    <span
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                    >
                      {showPassword ? (
                        <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                      ) : (
                        <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                      )}
                    </span>
                  </div>
                </div>
                {/* <!-- Checkbox --> */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    className="w-5 h-5"
                    checked={isChecked}
                    onChange={setIsChecked}
                  />
                  <p className="inline-block font-normal text-neutral-800 dark:text-gray-200">
                    By creating an account means you agree to the{" "}
                    <span className="text-gray-800 dark:text-white/90">
                      Terms and Conditions,
                    </span>{" "}
                    and our{" "}
                    <span className="text-gray-800 dark:text-white">
                      Privacy Policy
                    </span>
                  </p>
                </div>
                {/* <!-- Button --> */}
                <div>
                  <button
                    type="submit"
                    className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-orange-500 shadow-theme-xs hover:bg-orange-600 disabled:opacity-70 dark:bg-orange-500 dark:hover:bg-orange-400"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Sign Up"}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-neutral-900 dark:text-gray-100 sm:text-start">
                Already have an account? {" "}
                <Link
                  href="/auth/signin"
                  className="text-orange-500 hover:text-orange-600 dark:text-yellow-300"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
