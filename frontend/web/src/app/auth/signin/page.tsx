import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign In | GymHub",
  description: "Sign in to your GymHub account.",
};

export default function SignIn() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
