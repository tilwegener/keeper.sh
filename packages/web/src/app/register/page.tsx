"use client";

import type { FC } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { Header } from "@/components/header";
import { useAuth } from "@/components/auth-provider";
import {
  AuthFormContainer,
  AuthForm,
  AuthFormTitle,
  AuthFormError,
  AuthFormField,
  AuthFormSubmit,
  AuthFormFooter,
  AuthFormDivider,
  AuthSocialButton,
  AuthSocialButtons,
} from "@/components/auth-form";
import { GoogleIcon } from "@/components/icons/google";
import { useFormSubmit } from "@/hooks/use-form-submit";
import {
  signUp,
  signInWithGoogle,
  signInWithPasskey,
  isUsernameOnlyMode,
} from "@/lib/auth";

const UsernameRegisterForm: FC = () => {
  const router = useRouter();
  const { refresh } = useAuth();
  const { isSubmitting, error, submit } = useFormSubmit();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "") || undefined;

    await submit(async () => {
      await signUp(username, password, name);
      await refresh();
      router.push("/dashboard");
    });
  };

  return (
    <AuthForm onSubmit={handleSubmit}>
      <AuthFormTitle>Register</AuthFormTitle>
      <AuthFormError message={error} />
      <AuthFormField
        name="username"
        label="Username"
        required
        minLength={3}
        maxLength={32}
        autoComplete="username"
      />
      <AuthFormField name="name" label="Name (optional)" autoComplete="name" />
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

const EmailRegisterForm: FC = () => {
  const router = useRouter();
  const { refresh } = useAuth();
  const { isSubmitting, error, submit } = useFormSubmit();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    router.push(`/register/complete?email=${encodeURIComponent(email)}`);
  };

  const handleGoogleSignIn = async () => {
    await submit(async () => {
      await signInWithGoogle();
    });
  };

  const handlePasskeySignIn = async () => {
    await submit(async () => {
      await signInWithPasskey();
      await refresh();
      router.push("/dashboard");
    });
  };

  return (
    <AuthForm onSubmit={handleSubmit}>
      <AuthFormTitle>Register</AuthFormTitle>
      <AuthFormError message={error} />

      <AuthSocialButtons>
        <AuthSocialButton
          onClick={handleGoogleSignIn}
          isLoading={isSubmitting}
          icon={<GoogleIcon className="size-4" />}
        >
          Continue with Google
        </AuthSocialButton>
        <AuthSocialButton
          onClick={handlePasskeySignIn}
          isLoading={isSubmitting}
          icon={<Fingerprint className="size-4" />}
        >
          Continue with Passkey
        </AuthSocialButton>
      </AuthSocialButtons>

      <AuthFormDivider />

      <AuthFormField
        name="email"
        label="Email"
        type="email"
        required
        autoComplete="email"
      />

      <AuthFormSubmit isLoading={isSubmitting}>Continue</AuthFormSubmit>

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

const RegisterPage: FC = () => (
  <div className="flex flex-col flex-1">
    <Header />
    <AuthFormContainer>
      {isUsernameOnlyMode ? <UsernameRegisterForm /> : <EmailRegisterForm />}
    </AuthFormContainer>
  </div>
);

export default RegisterPage;
