import { Header } from "@/components/header";
import { AuthFormContainer } from "@/components/auth-form";
import { CompleteRegistrationForm } from "./form";

export default function CompleteRegistrationPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header />
      <AuthFormContainer>
        <CompleteRegistrationForm />
      </AuthFormContainer>
    </div>
  );
}
