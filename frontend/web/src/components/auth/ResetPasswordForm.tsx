"use client";

import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { requestForgotPasswordOtp, resetPasswordWithOtp } from "@/lib/auth";

export default function ResetPasswordForm() {
  const router = useRouter();
  const { error: showError, success: showSuccess } = useToast();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const handleRequestOtp = async () => {
    setEmailError(null);
    if (!email.trim()) {
      setEmailError("Email is required.");
      showError("Please enter your email.");
      return;
    }
    setSendingOtp(true);
    try {
      const res = await requestForgotPasswordOtp(email.trim());
      setOtpRequested(true);
      showSuccess(res.message || "If this email exists, an OTP has been sent. OTP expires in 5 minutes.");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setOtpError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    let hasError = false;
    if (!email.trim()) {
      setEmailError("Email is required.");
      hasError = true;
    }
    if (!/^\d{6}$/.test(otp.trim())) {
      setOtpError("OTP must be exactly 6 digits.");
      hasError = true;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      hasError = true;
    }
    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      hasError = true;
    }
    if (hasError) return;

    setResetting(true);
    try {
      await resetPasswordWithOtp({
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword,
      });
      showSuccess("Password reset successful. Please sign in.");
      router.push("/auth/signin");
    } catch (e: unknown) {
      showError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full bg-white dark:bg-stone-950">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-neutral-900 text-title-sm dark:text-yellow-300 sm:text-title-md">
              Reset Password
            </h1>
            <p className="text-sm text-neutral-800 dark:text-gray-200">
              Enter your email to receive a 6-digit OTP, then set a new password.
            </p>
          </div>
          <div>
            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <div className="space-y-6">
                <div>
                  <Label>
                    Email <span className="text-orange-500">*</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="info@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={!!emailError}
                    hint={emailError || undefined}
                  />
                </div>

                <div>
                  <Button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={sendingOtp}
                    className="w-full bg-white text-orange-500 border border-orange-500 hover:bg-orange-50 dark:bg-stone-900 dark:border-orange-500 dark:text-yellow-300"
                    size="sm"
                  >
                    {sendingOtp ? "Sending OTP..." : otpRequested ? "Resend OTP" : "Send OTP"}
                  </Button>
                </div>

                <div>
                  <Label>
                    OTP Code <span className="text-orange-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="6-digit code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    error={!!otpError}
                    hint={otpError || undefined}
                  />
                </div>

                <div>
                  <Label>
                    New Password <span className="text-orange-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    error={!!passwordError}
                    hint={passwordError || undefined}
                  />
                </div>

                <div>
                  <Label>
                    Confirm Password <span className="text-orange-500">*</span>
                  </Label>
                  <Input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={!!confirmPasswordError}
                    hint={confirmPasswordError || undefined}
                  />
                </div>

                <div>
                  <Button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-500 dark:hover:bg-orange-400"
                    size="sm"
                    type="submit"
                    disabled={resetting}
                  >
                    {resetting ? "Resetting..." : "Reset Password"}
                  </Button>
                </div>
              </div>
            </form>

            <div className="mt-5">
              <p className="text-sm font-normal text-center text-neutral-900 dark:text-gray-100 sm:text-start">
                Remember your password?{" "}
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
