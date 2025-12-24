"use client";

import type { FC } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AuthForm,
  AuthFormTitle,
  AuthFormError,
  AuthFormField,
  AuthFormSubmit,
  AuthFormFooter,
} from "@/components/auth-form";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { signUpWithEmail } from "@/lib/auth";

interface CompleteRegistrationFormProps {
  email: string;
}

export const CompleteRegistrationForm: FC<CompleteRegistrationFormProps> = ({
  email,
}) => {
  const router = useRouter();
  const { isSubmitting, error, submit } = useFormSubmit();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const password = String(formData.get("password") ?? "");

    await submit(async () => {
      await signUpWithEmail(email, password, name);
      router.push("/verify-email");
    });
  };

  return (
    <AuthForm onSubmit={handleSubmit}>
      <AuthFormTitle>Complete Registration</AuthFormTitle>
      <AuthFormError message={error} />
      <AuthFormField
        name="email"
        label="Email"
        type="email"
        disabled
        defaultValue={email}
        autoComplete="email"
      />
      <AuthFormField
        name="name"
        label="Name"
        required
        autoComplete="name"
      />
      <AuthFormField
        name="password"
        label="Password"
        type="password"
        required
        minLength={8}
        maxLength={128}
        autoComplete="new-password"
      />
      <AuthFormSubmit isLoading={isSubmitting}>Create account</AuthFormSubmit>
      <AuthFormFooter>
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground font-medium no-underline hover:underline"
        >
          Login
        </Link>
      </AuthFormFooter>
    </AuthForm>
  );
};
