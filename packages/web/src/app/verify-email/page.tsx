"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { Header } from "@/components/header";
import { AuthFormContainer } from "@/components/auth-form";
import { Button } from "@/components/button";
import { useAuth } from "@/components/auth-provider";
import { authClient } from "@/lib/auth-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { CardTitle, TextBody } from "@/components/typography";

const getPendingEmail = () => {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("pendingVerificationEmail");
};

export default function VerifyEmailPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { isSubmitting, error, submit } = useFormSubmit();

  useEffect(() => {
    if (!isLoading && user?.emailVerified) {
      sessionStorage.removeItem("pendingVerificationEmail");
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  const email = user?.email ?? getPendingEmail();

  async function handleResend() {
    if (!email) return;

    await submit(async () => {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/dashboard",
      });

      if (error) {
        throw new Error(error.message ?? "Failed to resend verification email");
      }
    });
  }

  if (isLoading || user?.emailVerified) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1">
      <Header />
      <AuthFormContainer>
        <div className="w-full max-w-xs p-4 rounded-md bg-surface text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-surface-subtle">
              <Mail className="size-6 text-foreground-muted" />
            </div>
          </div>

          <CardTitle as="h1" className="mb-2">
            Check your email
          </CardTitle>

          <TextBody className="text-sm text-foreground-muted mb-4">
            We sent you a verification link. Click the link in your email to
            verify your account.
          </TextBody>

          {error && (
            <TextBody className="text-sm text-destructive mb-4">
              {error}
            </TextBody>
          )}

          <Button
            onClick={handleResend}
            isLoading={isSubmitting}
            disabled={!email}
            className="w-full py-1.5 px-3 border border-border rounded-md text-sm font-medium bg-surface cursor-pointer transition-colors duration-150 hover:bg-surface-subtle disabled:opacity-50"
          >
            Resend verification email
          </Button>
        </div>
      </AuthFormContainer>
    </div>
  );
}
