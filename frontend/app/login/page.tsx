'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { FiLogIn } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { FaMicrosoft, FaIdCard } from 'react-icons/fa';
import { RiGovernmentFill } from 'react-icons/ri';

const providers = [
  { id: 'google', label: 'Continue with Google', icon: FcGoogle },
  { id: 'azure', label: 'Continue with Microsoft', icon: FaMicrosoft },
  { id: 'cac-piv', label: 'CAC / PIV Smart Card Authentication', icon: FaIdCard },
  { id: 'login-gov', label: 'Login.gov SSO', icon: RiGovernmentFill },
] as const;

type ProviderId = (typeof providers)[number]['id'];

export default function LoginPage() {
  const supabase = getSupabaseBrowserClient();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/dashboard');
      }
    });
  }, [router, supabase]);

  const handleOAuthLogin = async (provider: ProviderId) => {
    setError(null);
    setLoadingProvider(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoadingProvider(null);
      return;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1624] text-[#e0f2fd] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-[rgba(198,218,236,0.15)] bg-[#141d2d] shadow-[0_30px_60px_rgba(12,20,40,0.45)] p-10 space-y-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(70,98,171,0.2)]">
            <FiLogIn className="h-7 w-7 text-[#c6daec]" />
          </div>
          <h1 className="text-3xl font-semibold tracking-wide">Access Nautilink</h1>
          <p className="text-sm text-[#94aacd]">
            Sign in with your trusted identity provider to continue.
          </p>
        </div>

        <div className="space-y-3">
          {providers.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleOAuthLogin(id)}
              disabled={Boolean(loadingProvider)}
              className={`w-full flex items-center justify-center gap-3 rounded-2xl border border-[rgba(198,218,236,0.2)] px-4 py-3 text-sm font-medium transition-all ${
                loadingProvider === id
                  ? 'bg-[rgba(70,98,171,0.35)] text-[#c6daec]'
                  : 'bg-[#182335]/80 hover:bg-[#1f2d43]'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{loadingProvider === id ? 'Redirecting…' : label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4 text-[#6e82a4] text-sm">
          <span className="flex-1 h-px bg-[rgba(198,218,236,0.15)]" />
          <span>or</span>
          <span className="flex-1 h-px bg-[rgba(198,218,236,0.15)]" />
        </div>

        <form className="space-y-3">
          <input
            type="email"
            placeholder="Email address"
            className="w-full rounded-2xl border border-[rgba(198,218,236,0.2)] bg-[#10192a] px-4 py-3 text-sm text-[#e0f2fd] placeholder-[#6e82a4] focus:outline-none focus:border-[#4662ab]"
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-2xl border border-[rgba(198,218,236,0.2)] bg-[#10192a] px-4 py-3 text-sm text-[#e0f2fd] placeholder-[#6e82a4] focus:outline-none focus:border-[#4662ab]"
          />
          <button
            type="button"
            className="w-full rounded-2xl bg-gradient-to-r from-[#4662ab] to-[#5f7bda] px-4 py-3 text-sm font-semibold text-[#f4f8ff] shadow-[0_10px_20px_rgba(70,98,171,0.35)] transition hover:brightness-110"
          >
            Log in with Email
          </button>
        </form>
      </div>
    </div>
  );
}

