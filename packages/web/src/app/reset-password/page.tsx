"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Header } from "@/components/header";
import {
  AuthFormContainer,
  AuthForm,
  AuthFormTitle,
  AuthFormError,
  AuthFormField,
  AuthFormSubmit,
} from "@/components/auth-form";
import { CardTitle, TextBody } from "@/components/typography";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { resetPassword } from "@/lib/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [success, setSuccess] = useState(false);
  const { isSubmitting, error, submit } = useFormSubmit();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!token) return;

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      return;
    }

    await submit(async () => {
      await resetPassword(token, password);
      setSuccess(true);
    });
  }

  if (!token) {
    return (
      <div className="flex flex-col flex-1">
        <Header />
        <AuthFormContainer>
          <div className="w-full max-w-xs p-4 rounded-md bg-surface text-center">
            <CardTitle as="h1" className="mb-2">
              Invalid link
            </CardTitle>

            <TextBody className="text-sm text-foreground-muted mb-4">
              This password reset link is invalid or has expired.
            </TextBody>

            <Link
              href="/forgot-password"
              className="text-sm text-foreground font-medium hover:underline"
            >
              Request a new link
            </Link>
          </div>
        </AuthFormContainer>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col flex-1">
        <Header />
        <AuthFormContainer>
          <div className="w-full max-w-xs p-4 rounded-md bg-surface text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-success-surface">
                <CheckCircle className="size-6 text-success-emphasis" />
              </div>
            </div>

            <CardTitle as="h1" className="mb-2">
              Password reset
            </CardTitle>

            <TextBody className="text-sm text-foreground-muted mb-4">
              Your password has been successfully reset.
            </TextBody>

            <Link
              href="/login"
              className="text-sm text-foreground font-medium hover:underline"
            >
              Back to login
            </Link>
          </div>
        </AuthFormContainer>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <Header />
      <AuthFormContainer>
        <AuthForm onSubmit={handleSubmit}>
          <AuthFormTitle>Set new password</AuthFormTitle>
          <AuthFormError message={error} />

          <AuthFormField
            name="password"
            label="New password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />

          <AuthFormField
            name="confirmPassword"
            label="Confirm password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
          />

          <AuthFormSubmit isLoading={isSubmitting}>
            Reset password
          </AuthFormSubmit>
        </AuthForm>
      </AuthFormContainer>
    </div>
  );
}
