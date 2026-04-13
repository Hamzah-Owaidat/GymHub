import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Password | GymHub",
  description: "Reset your GymHub account password using OTP",
};

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
