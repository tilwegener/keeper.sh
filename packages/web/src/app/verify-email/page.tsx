"use client";

import { Mail } from "lucide-react";
import { Header } from "@/components/header";
import { AuthFormContainer } from "@/components/auth-form";
import { Button } from "@/components/button";
import { authClient } from "@/lib/auth-client";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { CardTitle, TextBody } from "@/components/typography";

export default function VerifyEmailPage() {
  const { isSubmitting, error, submit } = useFormSubmit();

  async function handleResend() {
    await submit(async () => {
      const { error } = await authClient.sendVerificationEmail({
        email: "", // Will use the current session's email
        callbackURL: "/dashboard",
      });

      if (error) {
        throw new Error(error.message ?? "Failed to resend verification email");
      }
    });
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
            className="w-full py-1.5 px-3 border border-border rounded-md text-sm font-medium bg-surface cursor-pointer transition-colors duration-150 hover:bg-surface-subtle disabled:opacity-50"
          >
            Resend verification email
          </Button>
        </div>
      </AuthFormContainer>
    </div>
  );
}
