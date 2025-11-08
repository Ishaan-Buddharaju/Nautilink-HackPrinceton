'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabaseClient';
import { FiGithub, FiLogIn } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { SiFacebook } from 'react-icons/si';
import { FaMicrosoft } from 'react-icons/fa';

const providers = [
  { id: 'google', label: 'Continue with Google', icon: FcGoogle },
  { id: 'facebook', label: 'Continue with Facebook', icon: SiFacebook },
  { id: 'azure', label: 'Continue with Microsoft', icon: FaMicrosoft },
  { id: 'github', label: 'Continue with GitHub', icon: FiGithub },
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

        <div className="rounded-2xl border border-[rgba(198,218,236,0.1)] bg-[#10192a] p-5 text-sm text-[#8da5c7]">
          <p className="font-medium text-[#c6daec]">Need an account?</p>
          <p className="mt-2">
            Use one of the providers above to create or link your Nautilink profile automatically.
          </p>
          <p className="mt-3">
            After signing in, you will land on the dashboard where you can manage fleet intelligence and
            maritime operations.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <p className="text-center text-xs text-[#6e82a4]">
          By signing in you agree to Nautilink’s acceptable use and data processing policies.
        </p>
      </div>
    </div>
  );
}

