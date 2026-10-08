import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AppLoader } from "@/components/layout/AppLoader";

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-background p-3"
    >
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<AppLoader />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
