import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Header } from "@/components/header";
import { AuthFormContainer } from "@/components/auth-form";
import { CompleteRegistrationForm } from "./form";

interface FormLoaderProps {
  searchParams: Promise<{ email?: string }>;
}

async function FormLoader({ searchParams }: FormLoaderProps) {
  const { email } = await searchParams;

  if (!email) {
    redirect("/register");
  }

  return <CompleteRegistrationForm email={email} />;
}

interface CompleteRegistrationPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default function CompleteRegistrationPage({
  searchParams,
}: CompleteRegistrationPageProps) {
  return (
    <div className="flex flex-col flex-1">
      <Header />
      <AuthFormContainer>
        <Suspense>
          <FormLoader searchParams={searchParams} />
        </Suspense>
      </AuthFormContainer>
    </div>
  );
}
