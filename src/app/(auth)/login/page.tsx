import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-lg border border-outline bg-surface-container-lowest p-4">
      <div className="mx-auto h-8 w-48 animate-pulse rounded-lg bg-surface-container-high" />
      <div className="mx-auto mt-4 h-10 w-56 animate-pulse rounded-lg bg-surface-container-high" />
      <div className="mt-8 space-y-4">
        <div className="h-11 animate-pulse rounded-lg bg-surface-container-high" />
        <div className="h-11 animate-pulse rounded-lg bg-surface-container-high" />
        <div className="h-11 animate-pulse rounded-lg bg-surface-container-high" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-background p-3"
    >
      <div className="relative z-10 w-full max-w-md">
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
