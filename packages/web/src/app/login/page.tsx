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
  signIn,
  signInWithEmail,
  signInWithGoogle,
  signInWithPasskey,
  isUsernameOnlyMode,
} from "@/lib/auth";

const UsernameLoginForm: FC = () => {
  const router = useRouter();
  const { refresh } = useAuth();
  const { isSubmitting, error, submit } = useFormSubmit();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    await submit(async () => {
      await signIn(username, password);
      await refresh();
      router.push("/dashboard");
    });
  };

  return (
    <AuthForm onSubmit={handleSubmit}>
      <AuthFormTitle>Login</AuthFormTitle>
      <AuthFormError message={error} />
      <AuthFormField
        name="username"
        label="Username"
        required
        autoComplete="username"
      />
      <AuthFormField
        name="password"
        label="Password"
        type="password"
        required
        autoComplete="current-password"
      />
      <AuthFormSubmit isLoading={isSubmitting}>Sign in</AuthFormSubmit>
      <AuthFormFooter>
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-foreground font-medium no-underline hover:underline"
        >
          Register
        </Link>
      </AuthFormFooter>
    </AuthForm>
  );
};

const EmailLoginForm: FC = () => {
  const router = useRouter();
  const { refresh } = useAuth();
  const { isSubmitting, error, submit } = useFormSubmit();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    await submit(async () => {
      await signInWithEmail(email, password);
      await refresh();
      router.push("/dashboard");
    });
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
      <AuthFormTitle>Login</AuthFormTitle>
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
      <AuthFormField
        name="password"
        label="Password"
        type="password"
        required
        autoComplete="current-password"
        labelAction={
          <Link
            href="/forgot-password"
            className="text-xs text-foreground-muted hover:text-foreground"
          >
            Forgot password?
          </Link>
        }
      />

      <AuthFormSubmit isLoading={isSubmitting}>Sign in</AuthFormSubmit>

      <AuthFormFooter>
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-foreground font-medium no-underline hover:underline"
        >
          Register
        </Link>
      </AuthFormFooter>
    </AuthForm>
  );
};

const LoginPage: FC = () => (
  <div className="flex flex-col flex-1">
    <Header />
    <AuthFormContainer>
      {isUsernameOnlyMode ? <UsernameLoginForm /> : <EmailLoginForm />}
    </AuthFormContainer>
  </div>
);

export default LoginPage;
