"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { useAuth } from "@/contexts/auth-context";

type Tab = "signin" | "signup";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";
  const { configured, user, loading: authLoading, signInWithEmail, signUpWithEmail } = useAuth();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      router.replace(redirect);
    }
  }, [user, authLoading, router, redirect]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (tab === "signin") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
      router.replace(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  if (!configured) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] text-[#1E3A5F] flex flex-col">
        <header className="border-b border-[#E8E4DF] bg-white px-8 py-4">
          <Link href="/" className="inline-block">
            <BrandLockup width={320} height={80} priority imageClassName="h-10 w-auto" />
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md border border-[#E8E4DF] bg-white p-8 text-center">
            <h1 className="mb-4 font-serif text-3xl">Authentication is unavailable</h1>
            <p className="mb-6 text-sm leading-relaxed text-[#6B6B6B]">
              This environment is running in local demo mode. Return home to use the case workflow without signing in.
            </p>
            <Link
              href={redirect}
              className="inline-block bg-[#1E3A5F] px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#1B5E3F]"
            >
              Return to app
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1E3A5F] flex flex-col">
      <header className="border-b border-[#E8E4DF] bg-white px-8 py-4">
        <Link href="/" className="inline-block">
          <BrandLockup width={320} height={80} priority imageClassName="h-10 w-auto" />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex border-b border-[#E8E4DF] mb-8">
            <button
              type="button"
              onClick={() => { setTab("signin"); setError(null); }}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest ${tab === "signin" ? "text-[#1E3A5F] border-b-2 border-[#1E3A5F]" : "text-[#6B6B6B] hover:text-[#1B5E3F]"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setTab("signup"); setError(null); }}
              className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest ${tab === "signup" ? "text-[#1E3A5F] border-b-2 border-[#1E3A5F]" : "text-[#6B6B6B] hover:text-[#1B5E3F]"}`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-1">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full border border-[#E8E4DF] bg-white px-4 py-3 text-sm text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B] mb-1">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={tab === "signin" ? "current-password" : "new-password"}
                minLength={6}
                className="w-full border border-[#E8E4DF] bg-white px-4 py-3 text-sm text-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]"
              />
            </div>
            {error ? (
              <p className="text-[11px] font-medium text-[#B83A3A]">{error}</p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#1E3A5F] text-white py-3 text-[11px] font-bold tracking-widest uppercase disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {tab === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-8 text-center">
            <Link href={redirect} className="text-[11px] text-[#6B6B6B] hover:text-[#1B5E3F]">
              ← Back to home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}
